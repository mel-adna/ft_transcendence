package com.teampulse.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
	public static class DailyCompletionTrend {
		private String key;        // "YYYY-MM-DD"
		private String label;      // "Sun", "27 Sep", etc.
		private long count;        // completed tasks count for prompt compatibility
		private long completed;    // completed tasks alias for chart compatibility
	}
}
