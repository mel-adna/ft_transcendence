package com.teampulse.backend.service;

import com.teampulse.backend.dto.response.WorkspaceStatsResponse;
import com.teampulse.backend.enums.TaskStatus;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceStatsService {

	private final WorkspaceRepository workspaceRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final TaskRepository taskRepository;

	@Transactional(readOnly = true)
	public WorkspaceStatsResponse getWorkspaceStats(UUID workspaceId, String userEmail, int days) {
		if (workspaceId == null) {
			throw new BadRequestException("Workspace ID cannot be null");
		}

		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail);
		if (!isMember) {
			log.warn("Access denied. User '{}' is not a member of workspace '{}'", userEmail, workspaceId);
			throw new UnauthorizedAccessException("Access denied. You are not a member of this workspace.");
		}

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found with ID: " + workspaceId));

		int effectiveDays = days > 0 ? days : 7;
		List<Task> tasks = taskRepository.findByWorkspaceId(workspaceId);

		long totalTasks = tasks.size();
		long todoCount = tasks.stream().filter(task -> task.getStatus() == TaskStatus.TODO).count();
		long inProgressCount = tasks.stream().filter(task -> task.getStatus() == TaskStatus.DOING).count();
		long completedCount = tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();

		double completionRate = totalTasks > 0
				? Math.round(((double) completedCount / (double) totalTasks * 100.0) * 10.0) / 10.0
				: 0.0;

		long activeColleagues = workspaceMemberRepository.countByWorkspaceId(workspaceId);

		Map<String, Long> completedPerDay = new HashMap<>();
		for (Task task : tasks) {
			if (task.getStatus() == TaskStatus.DONE && task.getUpdatedAt() != null) {
				LocalDate taskDate = LocalDate.ofInstant(task.getUpdatedAt(), ZoneId.systemDefault());
				String key = taskDate.format(DateTimeFormatter.ISO_LOCAL_DATE);
				completedPerDay.put(key, completedPerDay.getOrDefault(key, 0L) + 1L);
			}
		}

		List<WorkspaceStatsResponse.DailyCompletionTrend> trendList = new ArrayList<>();
		LocalDate today = LocalDate.now(ZoneId.systemDefault());
		for (int offset = effectiveDays - 1; offset >= 0; offset--) {
			LocalDate date = today.minusDays(offset);
			String key = date.format(DateTimeFormatter.ISO_LOCAL_DATE);
			String label = (effectiveDays <= 7)
					? date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
					: date.format(DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH));
			long count = completedPerDay.getOrDefault(key, 0L);

			trendList.add(WorkspaceStatsResponse.DailyCompletionTrend.builder()
					.key(key)
					.label(label)
					.count(count)
					.completed(count)
					.build());
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
				.completionTrend(trendList)
				.build();
	}
}
