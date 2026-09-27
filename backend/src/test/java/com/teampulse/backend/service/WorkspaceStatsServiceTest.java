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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WorkspaceStatsServiceTest {

	@Mock
	private WorkspaceRepository workspaceRepository;

	@Mock
	private WorkspaceMemberRepository workspaceMemberRepository;

	@Mock
	private TaskRepository taskRepository;

	@InjectMocks
	private WorkspaceStatsService workspaceStatsService;

	private UUID workspaceId;
	private String userEmail;
	private Workspace workspace;

	@BeforeEach
	void setUp() {
		workspaceId = UUID.randomUUID();
		userEmail = "member5@teampulse.com";
		workspace = new Workspace();
		workspace.setId(workspaceId);
		workspace.setName("Engineering Alpha");
	}

	@Test
	@DisplayName("Should return zero counts and zero completion rate for an empty workspace")
	void shouldReturnZeroStatsForEmptyWorkspace() {
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(Collections.emptyList());
		when(workspaceMemberRepository.countByWorkspaceId(workspaceId)).thenReturn(1L);

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		assertNotNull(response);
		assertEquals(0, response.getTotalTasks());
		assertEquals(0, response.getTodoCount());
		assertEquals(0, response.getInProgressCount());
		assertEquals(0, response.getCompletedCount());
		assertEquals(0.0, response.getCompletionRate());
		assertEquals(1, response.getActiveColleaguesCount());
		assertEquals(7, response.getCompletionTrend().size());

		for (WorkspaceStatsResponse.DailyCompletionTrend day : response.getCompletionTrend()) {
			assertEquals(0, day.getCount());
			assertEquals(0, day.getCompleted());
		}
	}

	@Test
	@DisplayName("Should correctly calculate task counts, completion rate, and satisfy status sum equation")
	void shouldCalculateCorrectStatusCountsAndRate() {
		Task task1 = new Task();
		task1.setStatus(TaskStatus.TODO);

		Task task2 = new Task();
		task2.setStatus(TaskStatus.DOING);

		Task task3 = new Task();
		task3.setStatus(TaskStatus.DONE);
		task3.setUpdatedAt(Instant.now());

		Task task4 = new Task();
		task4.setStatus(TaskStatus.DONE);
		task4.setUpdatedAt(Instant.now());

		List<Task> tasks = List.of(task1, task2, task3, task4);

		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(tasks);
		when(workspaceMemberRepository.countByWorkspaceId(workspaceId)).thenReturn(3L);

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		assertEquals(4, response.getTotalTasks());
		assertEquals(1, response.getTodoCount());
		assertEquals(1, response.getInProgressCount());
		assertEquals(2, response.getCompletedCount());
		assertEquals(50.0, response.getCompletionRate());
		assertEquals(3, response.getActiveColleaguesCount());

		// Equation: totalTasks == todoCount + inProgressCount + completedCount
		assertEquals(response.getTotalTasks(), response.getTodoCount() + response.getInProgressCount() + response.getCompletedCount());
	}

	@Test
	@DisplayName("Should throw UnauthorizedAccessException if user is not a member of the workspace")
	void shouldThrowExceptionWhenUserIsNotWorkspaceMember() {
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(false);

		UnauthorizedAccessException exception = assertThrows(UnauthorizedAccessException.class, () ->
				workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7));

		assertTrue(exception.getMessage().contains("Access denied"));
		verify(taskRepository, never()).findByWorkspaceId(any());
	}

	@Test
	@DisplayName("Should throw ResourceNotFoundException when workspace does not exist")
	void shouldThrowExceptionWhenWorkspaceDoesNotExist() {
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.empty());

		assertThrows(ResourceNotFoundException.class, () ->
				workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7));
	}

	@Test
	@DisplayName("Should throw BadRequestException when workspaceId is null")
	void shouldThrowExceptionWhenWorkspaceIdIsNull() {
		assertThrows(BadRequestException.class, () ->
				workspaceStatsService.getWorkspaceStats(null, userEmail, 7));
	}

	@Test
	@DisplayName("Should strictly isolate tasks by workspace and not include data from other workspaces")
	void shouldIsolateTasksByWorkspace() {
		UUID otherWorkspaceId = UUID.randomUUID();
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(Collections.emptyList());

		workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		verify(taskRepository).findByWorkspaceId(workspaceId);
		verify(taskRepository, never()).findByWorkspaceId(otherWorkspaceId);
	}

	@Test
	@DisplayName("Should correctly record daily completion trend on the exact day completed")
	void shouldAggregateDailyCompletionTrend() {
		LocalDate today = LocalDate.now(ZoneId.systemDefault());
		Instant todayInstant = today.atStartOfDay(ZoneId.systemDefault()).toInstant().plusSeconds(3600);

		Task taskDoneToday = new Task();
		taskDoneToday.setStatus(TaskStatus.DONE);
		taskDoneToday.setUpdatedAt(todayInstant);

		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(List.of(taskDoneToday));

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		String todayKey = today.format(DateTimeFormatter.ISO_LOCAL_DATE);
		WorkspaceStatsResponse.DailyCompletionTrend todayTrend = response.getCompletionTrend().stream()
				.filter(t -> t.getKey().equals(todayKey))
				.findFirst()
				.orElse(null);

		assertNotNull(todayTrend);
		assertEquals(1, todayTrend.getCount());
		assertEquals(1, todayTrend.getCompleted());
	}
}
