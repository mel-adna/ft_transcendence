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
import java.time.temporal.ChronoUnit;
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
	private User user1;
	private User user2;
	private WorkspaceMember member1;
	private WorkspaceMember member2;

	@BeforeEach
	void setUp() {
		workspaceId = UUID.randomUUID();
		userEmail = "member5@teampulse.com";

		workspace = new Workspace();
		workspace.setId(workspaceId);
		workspace.setName("Engineering Alpha");

		user1 = User.builder()
				.id(UUID.randomUUID())
				.firstName("Alice")
				.lastName("Smith")
				.email("alice@teampulse.com")
				.build();

		user2 = User.builder()
				.id(UUID.randomUUID())
				.firstName("Bob")
				.lastName("Jones")
				.email("bob@teampulse.com")
				.build();

		member1 = new WorkspaceMember();
		member1.setUser(user1);
		member1.setWorkspace(workspace);

		member2 = new WorkspaceMember();
		member2.setUser(user2);
		member2.setWorkspace(workspace);
	}

	@Test
	@DisplayName("Should return zero counts, safe distributions, and zero completion rate for an empty workspace")
	void shouldReturnZeroStatsForEmptyWorkspace() {
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(Collections.emptyList());
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(List.of(member1));
		when(workspaceMemberRepository.countByWorkspaceId(workspaceId)).thenReturn(1L);

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		assertNotNull(response);
		assertEquals(0, response.getTotalTasks());
		assertEquals(0, response.getTodoCount());
		assertEquals(0, response.getInProgressCount());
		assertEquals(0, response.getCompletedCount());
		assertEquals(0.0, response.getCompletionRate());
		assertEquals(1, response.getActiveColleaguesCount());
		assertEquals(0, response.getBacklogCount());
		assertEquals(0, response.getTasksCompletedInPeriod());
		assertEquals(0.0, response.getAverageCompletedPerDay());

		// Status distribution
		assertNotNull(response.getStatusDistribution());
		assertEquals(0, response.getStatusDistribution().getTodo());
		assertEquals(0, response.getStatusDistribution().getInProgress());
		assertEquals(0, response.getStatusDistribution().getCompleted());

		// Priority distribution
		assertNotNull(response.getPriorityDistribution());
		assertEquals(0, response.getPriorityDistribution().getLow());
		assertEquals(0, response.getPriorityDistribution().getMedium());
		assertEquals(0, response.getPriorityDistribution().getHigh());

		// Member stats
		assertEquals(1, response.getMemberStats().size());
		WorkspaceStatsResponse.MemberActivityStat stat = response.getMemberStats().get(0);
		assertEquals("Alice Smith", stat.getName());
		assertEquals(0, stat.getTotalAssigned());
		assertEquals(0.0, stat.getCompletionRate());

		// Completion trend
		assertEquals(7, response.getCompletionTrend().size());
		for (WorkspaceStatsResponse.DailyCompletionTrend day : response.getCompletionTrend()) {
			assertEquals(0, day.getCount());
			assertEquals(0, day.getCompleted());
		}
	}

	@Test
	@DisplayName("Should correctly calculate status and priority distributions and period completion metrics")
	void shouldCalculateCorrectStatusAndPriorityDistributions() {
		Task task1 = new Task();
		task1.setStatus(TaskStatus.TODO);
		task1.setPriority(TaskPriority.LOW);

		Task task2 = new Task();
		task2.setStatus(TaskStatus.DOING);
		task2.setPriority(TaskPriority.MEDIUM);

		Task task3 = new Task();
		task3.setStatus(TaskStatus.DONE);
		task3.setPriority(TaskPriority.HIGH);
		task3.setUpdatedAt(Instant.now());

		Task task4 = new Task();
		task4.setStatus(TaskStatus.DONE);
		task4.setPriority(null); // Should safely count as MEDIUM
		task4.setUpdatedAt(Instant.now());

		List<Task> tasks = List.of(task1, task2, task3, task4);

		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(tasks);
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(List.of(member1, member2));
		when(workspaceMemberRepository.countByWorkspaceId(workspaceId)).thenReturn(2L);

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		assertEquals(4, response.getTotalTasks());
		assertEquals(1, response.getTodoCount());
		assertEquals(1, response.getInProgressCount());
		assertEquals(2, response.getCompletedCount());
		assertEquals(50.0, response.getCompletionRate());
		assertEquals(1, response.getBacklogCount());
		assertEquals(2, response.getTasksCompletedInPeriod());
		assertEquals(0.29, response.getAverageCompletedPerDay()); // 2 / 7 = 0.2857 -> 0.29

		// Priority distribution
		assertEquals(1, response.getPriorityDistribution().getLow());
		assertEquals(2, response.getPriorityDistribution().getMedium());
		assertEquals(1, response.getPriorityDistribution().getHigh());
		assertEquals(response.getTotalTasks(),
				response.getPriorityDistribution().getLow() + response.getPriorityDistribution().getMedium() + response.getPriorityDistribution().getHigh());

		// Status distribution
		assertEquals(1, response.getStatusDistribution().getTodo());
		assertEquals(1, response.getStatusDistribution().getInProgress());
		assertEquals(2, response.getStatusDistribution().getCompleted());
		assertEquals(response.getTotalTasks(),
				response.getStatusDistribution().getTodo() + response.getStatusDistribution().getInProgress() + response.getStatusDistribution().getCompleted());
	}

	@Test
	@DisplayName("Should correctly breakdown per-member activity, handle unassigned tasks and zero-task members")
	void shouldCalculateMemberActivityBreakdownWithUnassigned() {
		// Task 1 assigned to user1 (DONE)
		Task task1 = new Task();
		task1.setStatus(TaskStatus.DONE);
		task1.setAssignee(user1);
		task1.setUpdatedAt(Instant.now());

		// Task 2 assigned to user1 (DOING)
		Task task2 = new Task();
		task2.setStatus(TaskStatus.DOING);
		task2.setAssignee(user1);

		// Task 3 assigned to user2 (TODO)
		Task task3 = new Task();
		task3.setStatus(TaskStatus.TODO);
		task3.setAssignee(user2);

		// Task 4 unassigned (DONE)
		Task task4 = new Task();
		task4.setStatus(TaskStatus.DONE);
		task4.setAssignee(null);
		task4.setUpdatedAt(Instant.now());

		// Member 3 with 0 tasks
		User user3 = User.builder().id(UUID.randomUUID()).firstName("Charlie").lastName("Day").email("charlie@teampulse.com").build();
		WorkspaceMember member3 = new WorkspaceMember();
		member3.setUser(user3);
		member3.setWorkspace(workspace);

		List<Task> tasks = List.of(task1, task2, task3, task4);
		List<WorkspaceMember> members = List.of(member1, member2, member3);

		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(tasks);
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(members);
		when(workspaceMemberRepository.countByWorkspaceId(workspaceId)).thenReturn(3L);

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);

		assertNotNull(response.getMemberStats());
		// 3 members + 1 unassigned = 4 entries
		assertEquals(4, response.getMemberStats().size());

		// Verify user1
		WorkspaceStatsResponse.MemberActivityStat stat1 = response.getMemberStats().stream()
				.filter(m -> user1.getId().equals(m.getUserId()))
				.findFirst().orElseThrow();
		assertEquals("Alice Smith", stat1.getName());
		assertEquals(2, stat1.getTotalAssigned());
		assertEquals(1, stat1.getCompleted());
		assertEquals(1, stat1.getInProgress());
		assertEquals(0, stat1.getTodo());
		assertEquals(50.0, stat1.getCompletionRate());

		// Verify user2
		WorkspaceStatsResponse.MemberActivityStat stat2 = response.getMemberStats().stream()
				.filter(m -> user2.getId().equals(m.getUserId()))
				.findFirst().orElseThrow();
		assertEquals("Bob Jones", stat2.getName());
		assertEquals(1, stat2.getTotalAssigned());
		assertEquals(0, stat2.getCompleted());
		assertEquals(0, stat2.getInProgress());
		assertEquals(1, stat2.getTodo());
		assertEquals(0.0, stat2.getCompletionRate());

		// Verify user3 (zero tasks)
		WorkspaceStatsResponse.MemberActivityStat stat3 = response.getMemberStats().stream()
				.filter(m -> user3.getId().equals(m.getUserId()))
				.findFirst().orElseThrow();
		assertEquals("Charlie Day", stat3.getName());
		assertEquals(0, stat3.getTotalAssigned());
		assertEquals(0.0, stat3.getCompletionRate());

		// Verify Unassigned
		WorkspaceStatsResponse.MemberActivityStat unassigned = response.getMemberStats().stream()
				.filter(m -> m.getUserId() == null)
				.findFirst().orElseThrow();
		assertEquals("Unassigned", unassigned.getName());
		assertEquals(1, unassigned.getTotalAssigned());
		assertEquals(1, unassigned.getCompleted());
		assertEquals(100.0, unassigned.getCompletionRate());

		// Equation: sum of totalAssigned across memberStats == totalTasks
		long sumAssigned = response.getMemberStats().stream().mapToLong(WorkspaceStatsResponse.MemberActivityStat::getTotalAssigned).sum();
		assertEquals(response.getTotalTasks(), sumAssigned);
	}

	@Test
	@DisplayName("Should correctly handle 7, 14, 30 days and All Time date ranges")
	void shouldHandleDifferentDateRanges() {
		Instant now = Instant.now();
		Instant tenDaysAgo = now.minus(10, ChronoUnit.DAYS);
		Instant twentyDaysAgo = now.minus(20, ChronoUnit.DAYS);

		Task taskRecent = new Task();
		taskRecent.setStatus(TaskStatus.DONE);
		taskRecent.setUpdatedAt(now);

		Task taskMid = new Task();
		taskMid.setStatus(TaskStatus.DONE);
		taskMid.setUpdatedAt(tenDaysAgo);

		Task taskOld = new Task();
		taskOld.setStatus(TaskStatus.DONE);
		taskOld.setUpdatedAt(twentyDaysAgo);

		List<Task> tasks = List.of(taskRecent, taskMid, taskOld);

		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(tasks);
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(List.of(member1));

		// 7 Days: only taskRecent is in period
		WorkspaceStatsResponse stats7 = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7);
		assertEquals(7, stats7.getCompletionTrend().size());
		assertEquals(1, stats7.getTasksCompletedInPeriod());

		// 14 Days: taskRecent and taskMid in period
		WorkspaceStatsResponse stats14 = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 14);
		assertEquals(14, stats14.getCompletionTrend().size());
		assertEquals(2, stats14.getTasksCompletedInPeriod());

		// 30 Days: all 3 in period
		WorkspaceStatsResponse stats30 = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 30);
		assertEquals(30, stats30.getCompletionTrend().size());
		assertEquals(3, stats30.getTasksCompletedInPeriod());

		// All Time (days = 0): all 3 completed tasks in period
		WorkspaceStatsResponse statsAll = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 0);
		assertEquals(3, statsAll.getTasksCompletedInPeriod());
		assertTrue(statsAll.getCompletionTrend().size() >= 21); // span is ~21 days, so daily buckets
	}

	@Test
	@DisplayName("Should aggregate by month when all-time date span exceeds 60 days")
	void shouldAggregateAllTimeMonthlyTrendWhenSpanExceeds60Days() {
		Instant now = Instant.now();
		Instant ninetyDaysAgo = now.minus(90, ChronoUnit.DAYS);

		Task taskOld = new Task();
		taskOld.setStatus(TaskStatus.DONE);
		taskOld.setCreatedAt(ninetyDaysAgo);
		taskOld.setUpdatedAt(ninetyDaysAgo);

		Task taskNew = new Task();
		taskNew.setStatus(TaskStatus.DONE);
		taskNew.setCreatedAt(now);
		taskNew.setUpdatedAt(now);

		List<Task> tasks = List.of(taskOld, taskNew);

		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(tasks);
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(List.of(member1));

		WorkspaceStatsResponse stats = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 0);

		assertEquals(2, stats.getTasksCompletedInPeriod());
		// 90 days span is approx 3-4 months
		assertTrue(stats.getCompletionTrend().size() <= 6);
		// Each trend entry key should be in YYYY-MM format
		for (WorkspaceStatsResponse.DailyCompletionTrend bucket : stats.getCompletionTrend()) {
			assertTrue(bucket.getKey().matches("\\d{4}-\\d{2}"));
		}
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
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(Collections.emptyList());

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
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(List.of(member1));

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

	private Task task(TaskStatus status, TaskPriority priority, User assignee, Instant updatedAt) {
		Task task = new Task();
		task.setStatus(status);
		task.setPriority(priority);
		task.setAssignee(assignee);
		task.setUpdatedAt(updatedAt);
		return task;
	}

	private void stubWorkspace(List<Task> tasks) {
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
		when(taskRepository.findByWorkspaceId(workspaceId)).thenReturn(tasks);
		when(workspaceMemberRepository.findByWorkspaceIdWithUser(workspaceId)).thenReturn(List.of(member1, member2));
	}

	@Test
	@DisplayName("Should count only completions inside an inclusive custom from/to range")
	void shouldUseCustomFromToRange() {
		LocalDate today = LocalDate.now(ZoneId.systemDefault());
		Instant tenDaysAgo = today.minusDays(10).atStartOfDay(ZoneId.systemDefault()).toInstant().plusSeconds(3600);
		stubWorkspace(List.of(
				task(TaskStatus.DONE, TaskPriority.LOW, null, Instant.now()),
				task(TaskStatus.DONE, TaskPriority.LOW, null, tenDaysAgo)));

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7,
				today.minusDays(12).toString(), today.minusDays(10).toString(), null, null, null);

		assertEquals(1, response.getTasksCompletedInPeriod());
		assertEquals(3, response.getCompletionTrend().size());
		assertEquals(today.minusDays(12).toString(), response.getCompletionTrend().get(0).getKey());
	}

	@Test
	@DisplayName("Should compute stats only for tasks matching the status filter")
	void shouldFilterByStatus() {
		stubWorkspace(List.of(
				task(TaskStatus.TODO, TaskPriority.LOW, null, null),
				task(TaskStatus.DOING, TaskPriority.LOW, null, null),
				task(TaskStatus.DONE, TaskPriority.LOW, null, Instant.now())));

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7,
				null, null, "done", null, null);

		assertEquals(1, response.getTotalTasks());
		assertEquals(1, response.getCompletedCount());
		assertEquals(0, response.getTodoCount());
	}

	@Test
	@DisplayName("Should filter by priority and treat a missing priority as MEDIUM")
	void shouldFilterByPriority() {
		stubWorkspace(List.of(
				task(TaskStatus.TODO, TaskPriority.HIGH, null, null),
				task(TaskStatus.TODO, TaskPriority.MEDIUM, null, null),
				task(TaskStatus.TODO, null, null, null)));

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7,
				null, null, null, "MEDIUM", null);

		assertEquals(2, response.getTotalTasks());
		assertEquals(0, response.getPriorityDistribution().getHigh());
	}

	@Test
	@DisplayName("Should compute stats only for tasks assigned to the selected member")
	void shouldFilterByAssignee() {
		stubWorkspace(List.of(
				task(TaskStatus.DONE, TaskPriority.LOW, user1, Instant.now()),
				task(TaskStatus.TODO, TaskPriority.LOW, user2, null),
				task(TaskStatus.TODO, TaskPriority.LOW, null, null)));

		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(workspaceId, userEmail, 7,
				null, null, null, null, user1.getId().toString());

		assertEquals(1, response.getTotalTasks());
		assertEquals(100.0, response.getCompletionRate());
	}

	@Test
	@DisplayName("Should reject an inverted date range and unknown filter values")
	void shouldRejectInvalidRangeAndFilters() {
		when(workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, userEmail)).thenReturn(true);
		when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));

		assertThrows(BadRequestException.class, () -> workspaceStatsService.getWorkspaceStats(
				workspaceId, userEmail, 7, "2026-09-10", "2026-09-01", null, null, null));
		assertThrows(BadRequestException.class, () -> workspaceStatsService.getWorkspaceStats(
				workspaceId, userEmail, 7, "2026-09-01", null, null, null, null));
		assertThrows(BadRequestException.class, () -> workspaceStatsService.getWorkspaceStats(
				workspaceId, userEmail, 7, null, null, "BLOCKED", null, null));
	}
}
