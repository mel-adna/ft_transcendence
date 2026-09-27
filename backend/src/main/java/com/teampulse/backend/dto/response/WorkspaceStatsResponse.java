package com.teampulse.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceStatsResponse {
	private long totalTasks;
	private long todoCount;
	private long inProgressCount;
	private long completedCount;
	private double completionRate;
	private long activeColleaguesCount;
	private long tasksCompletedInPeriod;
	private double averageCompletedPerDay;
	private long backlogCount;
	private StatusDistribution statusDistribution;
	private PriorityDistribution priorityDistribution;
	private List<MemberActivityStat> memberStats;
	private List<DailyCompletionTrend> completionTrend;

	// Backward-compatibility accessors for frontend flexibility
	public long getTotal() {
		return totalTasks;
	}

	public long getTodo() {
		return todoCount;
	}

	public long getInProgress() {
		return inProgressCount;
	}

	public long getCompleted() {
		return completedCount;
	}

	public long getActiveColleagues() {
		return activeColleaguesCount;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class StatusDistribution {
		private long todo;
		private long inProgress;
		private long completed;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class PriorityDistribution {
		private long low;
		private long medium;
		private long high;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class MemberActivityStat {
		private UUID userId;
		private String name;
		private String email;
		private String avatarUrl;
		private long totalAssigned;
		private long completed;
		private long inProgress;
		private long todo;
		private double completionRate;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class DailyCompletionTrend {
		private String key;        // "YYYY-MM-DD" or "YYYY-MM"
		private String label;      // "Sun", "27 Sep", "Sep 2026", etc.
		private long count;        // completed tasks count for prompt compatibility
		private long completed;    // completed tasks alias for chart compatibility
	}
}
