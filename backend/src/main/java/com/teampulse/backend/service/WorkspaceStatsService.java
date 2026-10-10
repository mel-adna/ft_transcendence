package com.teampulse.backend.service;

import com.teampulse.backend.dto.response.WorkspaceStatsResponse;
import com.teampulse.backend.enums.TaskPriority;
import com.teampulse.backend.enums.TaskStatus;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
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

		LocalDate fromDate = parseParam(from, "from", LocalDate::parse);
		LocalDate toDate = parseParam(to, "to", LocalDate::parse);
		TaskStatus statusFilter = parseParam(status, "status", value -> TaskStatus.valueOf(value.toUpperCase()));
		TaskPriority priorityFilter = parseParam(priority, "priority", value -> TaskPriority.valueOf(value.toUpperCase()));
		UUID assigneeFilter = parseParam(assigneeId, "assigneeId", UUID::fromString);

		if ((fromDate == null) != (toDate == null)) {
			throw new BadRequestException("Both 'from' and 'to' are required for a custom date range");
		}
		if (fromDate != null && fromDate.isAfter(toDate)) {
			throw new BadRequestException("'from' must be on or before 'to'");
		}
		if (fromDate != null && ChronoUnit.DAYS.between(fromDate, toDate) + 1 > MAX_CUSTOM_RANGE_DAYS) {
			throw new BadRequestException("Custom date range cannot exceed " + MAX_CUSTOM_RANGE_DAYS + " days");
		}

		String statusStr = statusFilter != null ? statusFilter.name() : null;
		String priorityStr = priorityFilter != null ? priorityFilter.name() : null;

		List<Object[]> statusCounts = taskRepository.countTasksByStatusFiltered(workspaceId, statusStr, priorityStr, assigneeFilter);
		long todoCount = 0;
		long inProgressCount = 0;
		long completedCount = 0;
		long totalTasks = 0;

		for (Object[] row : statusCounts) {
			if (row[0] != null && row[1] != null) {
				String stName = row[0].toString();
				long count = ((Number) row[1]).longValue();
				totalTasks += count;
				if ("TODO".equalsIgnoreCase(stName)) todoCount = count;
				else if ("DOING".equalsIgnoreCase(stName)) inProgressCount = count;
				else if ("DONE".equalsIgnoreCase(stName)) completedCount = count;
			}
		}

		double completionRate = percent(completedCount, totalTasks);
		long activeColleagues = workspaceMemberRepository.countByWorkspaceId(workspaceId);
		long backlogCount = todoCount;

		List<Object[]> priorityCounts = taskRepository.countTasksByPriorityFiltered(workspaceId, statusStr, priorityStr, assigneeFilter);
		long lowPriority = 0;
		long mediumPriority = 0;
		long highPriority = 0;

		for (Object[] row : priorityCounts) {
			if (row[0] != null && row[1] != null) {
				String prName = row[0].toString();
				long count = ((Number) row[1]).longValue();
				if ("LOW".equalsIgnoreCase(prName)) lowPriority = count;
				else if ("MEDIUM".equalsIgnoreCase(prName)) mediumPriority = count;
				else if ("HIGH".equalsIgnoreCase(prName)) highPriority = count;
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

		List<Object[]> memberTaskCounts = taskRepository.countTasksByAssigneeAndStatusFiltered(workspaceId, statusStr, priorityStr, assigneeFilter);
		for (Object[] row : memberTaskCounts) {
			UUID assigneeUuid = (UUID) row[0];
			String stName = row[1] != null ? row[1].toString() : "";
			long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;

			WorkspaceStatsResponse.MemberActivityStat stat = (assigneeUuid == null)
					? unassigned
					: memberMap.get(assigneeUuid);

			if (stat != null) {
				stat.setTotalAssigned(stat.getTotalAssigned() + count);
				if ("DONE".equalsIgnoreCase(stName)) stat.setCompleted(stat.getCompleted() + count);
				else if ("DOING".equalsIgnoreCase(stName)) stat.setInProgress(stat.getInProgress() + count);
				else stat.setTodo(stat.getTodo() + count);
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

		int effectiveDays = (days < 0 || days > MAX_CUSTOM_RANGE_DAYS) ? 7 : days;
		LocalDate today = LocalDate.now(ZoneId.systemDefault());
		LocalDate rangeStart = fromDate != null ? fromDate : (effectiveDays > 0 ? today.minusDays(effectiveDays - 1) : null);
		LocalDate rangeEnd = toDate != null ? toDate : today;
		long tasksCompletedInPeriod;
		double averageCompletedPerDay;
		List<WorkspaceStatsResponse.DailyCompletionTrend> trendList = new ArrayList<>();

		Instant startInstant = rangeStart != null ? rangeStart.atStartOfDay(ZoneId.systemDefault()).toInstant() : null;
		Instant endInstant = rangeEnd != null ? rangeEnd.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant() : null;

		List<Object[]> dailyCounts = taskRepository.countCompletedTasksPerDayFiltered(workspaceId, statusStr, priorityStr, assigneeFilter, startInstant, endInstant);
		Map<String, Long> completedPerDay = new HashMap<>();
		Map<String, Long> completedPerMonth = new HashMap<>();

		for (Object[] row : dailyCounts) {
			if (row[0] != null && row[1] != null) {
				String dayKey = row[0].toString();
				long count = ((Number) row[1]).longValue();
				completedPerDay.put(dayKey, count);

				if (dayKey.length() >= 7) {
					String monthKey = dayKey.substring(0, 7);
					completedPerMonth.merge(monthKey, count, Long::sum);
				}
			}
		}

		if (rangeStart != null) {
			long rangeDays = ChronoUnit.DAYS.between(rangeStart, rangeEnd) + 1;
			tasksCompletedInPeriod = completedPerDay.values().stream().mapToLong(Long::longValue).sum();
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
			Instant earliestInstant = taskRepository.findEarliestTaskInstantFiltered(workspaceId, statusStr, priorityStr, assigneeFilter);
			LocalDate earliestDate = earliestInstant != null
					? LocalDate.ofInstant(earliestInstant, ZoneId.systemDefault())
					: today;

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