package com.teampulse.backend.controller;

import com.teampulse.backend.dto.response.ErrorResponse;
import com.teampulse.backend.dto.response.WorkspaceStatsResponse;
import com.teampulse.backend.security.ratelimit.RateLimit;
import com.teampulse.backend.security.ratelimit.RateLimitKeyType;
import com.teampulse.backend.service.WorkspaceStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RateLimit(capacity = 60, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
@Tag(name = "Workspace Stats & Analytics", description = "Endpoints for workspace-isolated task statistics and analytics.")
@SecurityRequirement(name = "bearerAuth")
public class StatsController {

	private final WorkspaceStatsService workspaceStatsService;

	@Operation(summary = "Get workspace task analytics and stats", description = "Retrieves tenant-isolated task counts, completion rate, active colleagues, and completion trend.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Workspace stats retrieved successfully"),
			@ApiResponse(responseCode = "400", description = "Invalid workspace ID, date range or filter", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "403", description = "Forbidden - Not a member of this workspace", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "404", description = "Workspace not found", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	@GetMapping(value = {"/workspaces/{workspaceId}/stats", "/stats/workspace/{workspaceId}"})
	public ResponseEntity<WorkspaceStatsResponse> getWorkspaceStats(
			@Parameter(description = "UUID of the workspace") @PathVariable UUID workspaceId,
			@Parameter(description = "Number of trend days (default: 7, 0 for all time)") @RequestParam(defaultValue = "7") int days,
			@Parameter(description = "Custom range start, inclusive (YYYY-MM-DD); overrides days") @RequestParam(required = false) String from,
			@Parameter(description = "Custom range end, inclusive (YYYY-MM-DD)") @RequestParam(required = false) String to,
			@Parameter(description = "Only count tasks with this status (TODO, DOING, DONE)") @RequestParam(required = false) String status,
			@Parameter(description = "Only count tasks with this priority (LOW, MEDIUM, HIGH)") @RequestParam(required = false) String priority,
			@Parameter(description = "Only count tasks assigned to this user") @RequestParam(required = false) String assigneeId,
			Principal principal) {
		WorkspaceStatsResponse response = workspaceStatsService.getWorkspaceStats(
				workspaceId, principal.getName(), days, from, to, status, priority, assigneeId);
		return ResponseEntity.ok(response);
	}
}