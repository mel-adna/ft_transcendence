package com.teampulse.backend.service;

import com.teampulse.backend.dto.response.WorkspaceStatsResponse;
import com.teampulse.backend.enums.TaskPriority;
import com.teampulse.backend.enums.TaskStatus;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.repository.WorkspaceRepository;
import com.teampulse.backend.security.utils.EmailUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceStatsService {

	private final WorkspaceRepository workspaceRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final TaskRepository taskRepository;

	private static final int MAX_CUSTOM_RANGE_DAYS = 366;

	@Transactional(readOnly = true)
	public WorkspaceStatsResponse getWorkspaceStats(UUID workspaceId, String userEmail, int days) {
		return getWorkspaceStats(workspaceId, userEmail, days, null, null, null, null, null);
	}

	@Transactional(readOnly = true)
	public WorkspaceStatsResponse getWorkspaceStats(UUID workspaceId, String userEmail, int days,
	                                                String from, String to, String status, String priority, String assigneeId) {
		if (workspaceId == null) {
			throw new BadRequestException("Workspace ID cannot be null");
		}

		String cleanEmail = EmailUtils.normalize(userEmail);

		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, cleanEmail);
		if (!isMember) {
			log.warn("Access denied. User '{}' is not a member of workspace '{}'", EmailUtils.maskEmail(cleanEmail), workspaceId);
			throw new UnauthorizedAccessException("Access denied. You are not a member of this workspace.");
		}

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found with ID: " + workspaceId));

		// 1. حساب تجميع الحالات مباشرة باستخدام SQL GROUP BY
		List<Object[]> statusCounts = taskRepository.countTasksByStatusForWorkspace(workspaceId);
		long todoCount = 0;
		long inProgressCount = 0;
		long completedCount = 0;
		long totalTasks = 0;

		for (Object[] row : statusCounts) {
			TaskStatus status = (TaskStatus) row[0];
			Long count = (Long) row[1];
			totalTasks += count;

			if (status == TaskStatus.TODO) {
				todoCount = count;
			} else if (status == TaskStatus.DOING) {
				inProgressCount = count;
			} else if (status == TaskStatus.DONE) {
				completedCount = count;
			}
		}

		double completionRate = percent(completedCount, totalTasks);

		long activeColleagues = workspaceMemberRepository.countByWorkspaceId(workspaceId);
		long backlogCount = todoCount;

		// 2. حساب تجميع الأولويات مباشرة باستخدام SQL GROUP BY
		List<Object[]> priorityCounts = taskRepository.countTasksByPriorityForWorkspace(workspaceId);
		long lowPriority = 0;
		long mediumPriority = 0;
		long highPriority = 0;

		for (Object[] row : priorityCounts) {
			TaskPriority priority = (TaskPriority) row[0];
			Long count = (Long) row[1];

			if (priority == TaskPriority.LOW) {
				lowPriority = count;
			} else if (priority == TaskPriority.MEDIUM || priority == null) {
				mediumPriority += count;
			} else if (priority == TaskPriority.HIGH) {
				highPriority = count;
			}
		}

		WorkspaceStatsResponse.PriorityDistribution priorityDistribution = WorkspaceStatsResponse.PriorityDistribution.builder()
				.low(lowPriority)
				.medium(mediumPriority)
				.high(highPriority)
				.build();

		WorkspaceStatsResponse.StatusDistribution statusDistribution = WorkspaceStatsResponse.StatusDistribution.builder()
				.todo(todoCount)
				.inProgress(inProgressCount)
				.completed(completedCount)
				.build();

		List<Task> tasks = taskRepository.findByWorkspaceId(workspaceId);
		List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId);

		Map<UUID, WorkspaceStatsResponse.MemberActivityStat> memberMap = new LinkedHashMap<>();
		for (WorkspaceMember member : members) {
			User user = member.getUser();
			if (user != null && user.getId() != null) {
				memberMap.put(user.getId(), newMemberStat(user));
			}
		}

		WorkspaceStatsResponse.MemberActivityStat unassigned = WorkspaceStatsResponse.MemberActivityStat.builder()
				.name("Unassigned")
				.build();

		for (Task task : tasks) {
			User assignee = task.getAssignee();
			if (assignee == null || assignee.getId() == null) {
				countTask(unassigned, task);
			} else {
				countTask(memberMap.computeIfAbsent(assignee.getId(), id -> newMemberStat(assignee)), task);
			}
		}

		List<WorkspaceStatsResponse.MemberActivityStat> memberStats = new ArrayList<>(memberMap.values());
		memberStats.sort(Comparator.comparingLong(WorkspaceStatsResponse.MemberActivityStat::getTotalAssigned).reversed()
				.thenComparing(WorkspaceStatsResponse.MemberActivityStat::getName, String.CASE_INSENSITIVE_ORDER));

		if (unassigned.getTotalAssigned() > 0) {
			memberStats.add(unassigned);
		}

		for (WorkspaceStatsResponse.MemberActivityStat stat : memberStats) {
			stat.setCompletionRate(percent(stat.getCompleted(), stat.getTotalAssigned()));
		}

		// Date range handling: from/to wins; otherwise days = 0 means All Time and days < 0 defaults to 7
		int effectiveDays = days < 0 ? 7 : days;
		LocalDate today = LocalDate.now(ZoneId.systemDefault());
		LocalDate rangeStart = fromDate != null ? fromDate : (effectiveDays > 0 ? today.minusDays(effectiveDays - 1) : null);
		LocalDate rangeEnd = toDate != null ? toDate : today;
		long tasksCompletedInPeriod;
		double averageCompletedPerDay;
		List<WorkspaceStatsResponse.DailyCompletionTrend> trendList = new ArrayList<>();

		Map<String, Long> completedPerDay = new HashMap<>();
		Map<String, Long> completedPerMonth = new HashMap<>();
		for (Task task : tasks) {
			if (task.getStatus() == TaskStatus.DONE && task.getUpdatedAt() != null) {
				LocalDate taskDate = LocalDate.ofInstant(task.getUpdatedAt(), ZoneId.systemDefault());
				completedPerDay.merge(taskDate.format(DateTimeFormatter.ISO_LOCAL_DATE), 1L, Long::sum);
				completedPerMonth.merge(taskDate.format(DateTimeFormatter.ofPattern("yyyy-MM")), 1L, Long::sum);
			}
		}

		if (rangeStart != null) {
			long rangeDays = ChronoUnit.DAYS.between(rangeStart, rangeEnd) + 1;
			Instant startInstant = rangeStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
			Instant endInstant = rangeEnd.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

			tasksCompletedInPeriod = tasks.stream()
					.filter(task -> task.getStatus() == TaskStatus.DONE && task.getUpdatedAt() != null
							&& !task.getUpdatedAt().isBefore(startInstant) && task.getUpdatedAt().isBefore(endInstant))
					.count();

			averageCompletedPerDay = Math.round(((double) tasksCompletedInPeriod / (double) rangeDays) * 100.0) / 100.0;

			for (LocalDate date = rangeStart; !date.isAfter(rangeEnd); date = date.plusDays(1)) {
				String key = date.format(DateTimeFormatter.ISO_LOCAL_DATE);
				String label = (rangeDays <= 7)
						? date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
						: date.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH));
				long count = completedPerDay.getOrDefault(key, 0L);

				trendList.add(trendPoint(key, label, count));
			}
		} else {
			tasksCompletedInPeriod = completedCount;

			LocalDate earliestDate = tasks.stream()
					.map(task -> {
						if (task.getCreatedAt() != null) return LocalDate.ofInstant(task.getCreatedAt(), ZoneId.systemDefault());
						if (task.getUpdatedAt() != null) return LocalDate.ofInstant(task.getUpdatedAt(), ZoneId.systemDefault());
						return today;
					})
					.min(LocalDate::compareTo)
					.orElse(today);

			long daysSpan = ChronoUnit.DAYS.between(earliestDate, today) + 1;
			if (daysSpan < 1) daysSpan = 1;

			averageCompletedPerDay = Math.round(((double) completedCount / (double) daysSpan) * 100.0) / 100.0;

			if (daysSpan <= 60) {
				for (LocalDate date = earliestDate; !date.isAfter(today); date = date.plusDays(1)) {
					String key = date.format(DateTimeFormatter.ISO_LOCAL_DATE);
					String label = date.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH));
					long count = completedPerDay.getOrDefault(key, 0L);
					trendList.add(trendPoint(key, label, count));
				}
			} else {
				YearMonth startMonth = YearMonth.from(earliestDate);
				YearMonth endMonth = YearMonth.from(today);
				for (YearMonth month = startMonth; !month.isAfter(endMonth); month = month.plusMonths(1)) {
					String key = month.format(DateTimeFormatter.ofPattern("yyyy-MM"));
					String label = month.format(DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH));
					long count = completedPerMonth.getOrDefault(key, 0L);
					trendList.add(trendPoint(key, label, count));
				}
			}

			if (trendList.isEmpty()) {
				String key = today.format(DateTimeFormatter.ISO_LOCAL_DATE);
				trendList.add(trendPoint(key, "Today", 0L));
			}
		}

		log.info("Calculated stats for workspace '{}' (ID: {}): total={}, todo={}, doing={}, done={}, rate={}%",
				workspace.getName(), workspaceId, totalTasks, todoCount, inProgressCount, completedCount, completionRate);

		return WorkspaceStatsResponse.builder()
				.totalTasks(totalTasks)
				.todoCount(todoCount)
				.inProgressCount(inProgressCount)
				.completedCount(completedCount)
				.completionRate(completionRate)
				.activeColleaguesCount(activeColleagues)
				.tasksCompletedInPeriod(tasksCompletedInPeriod)
				.averageCompletedPerDay(averageCompletedPerDay)
				.backlogCount(backlogCount)
				.statusDistribution(statusDistribution)
				.priorityDistribution(priorityDistribution)
				.memberStats(memberStats)
				.completionTrend(trendList)
				.build();
	}

	private static double percent(long part, long total) {
		return total > 0 ? Math.round(((double) part / (double) total * 100.0) * 10.0) / 10.0 : 0.0;
	}

	private WorkspaceStatsResponse.MemberActivityStat newMemberStat(User user) {
		return WorkspaceStatsResponse.MemberActivityStat.builder()
				.userId(user.getId())
				.name(buildDisplayName(user.getFirstName(), user.getLastName(), user.getEmail()))
				.email(user.getEmail())
				.avatarUrl(user.getAvatarUrl())
				.build();
	}

	private static void countTask(WorkspaceStatsResponse.MemberActivityStat stat, Task task) {
		stat.setTotalAssigned(stat.getTotalAssigned() + 1);
		if (task.getStatus() == TaskStatus.DONE) {
			stat.setCompleted(stat.getCompleted() + 1);
		} else if (task.getStatus() == TaskStatus.DOING) {
			stat.setInProgress(stat.getInProgress() + 1);
		} else {
			stat.setTodo(stat.getTodo() + 1);
		}
	}

	private static WorkspaceStatsResponse.DailyCompletionTrend trendPoint(String key, String label, long count) {
		return WorkspaceStatsResponse.DailyCompletionTrend.builder()
				.key(key)
				.label(label)
				.count(count)
				.completed(count)
				.build();
	}

	private static <T> T parseParam(String value, String name, Function<String, T> parser) {
		if (value == null || value.isBlank()) {
			return null;
		}
		try {
			return parser.apply(value.trim());
		} catch (RuntimeException e) {
			throw new BadRequestException("Invalid '" + name + "' value: " + value);
		}
	}

	private String buildDisplayName(String firstName, String lastName, String email) {
		String first = firstName != null ? firstName.trim() : "";
		String last = lastName != null ? lastName.trim() : "";
		String full = (first + " " + last).trim();
		if (!full.isEmpty()) {
			return full;
		}
		if (email != null && !email.isBlank()) {
			return email;
		}
		return "Member";
	}
}