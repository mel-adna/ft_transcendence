package com.teampulse.backend.controller;

import java.security.Principal;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.teampulse.backend.dto.response.ActivityLogResponse;
import com.teampulse.backend.service.ActivityLogService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/activity-logs")
@RequiredArgsConstructor
@Tag(name = "Activity Logs", description = "Endpoints for retrieving activity trail history.")
public class ActivityLogController {
	private final ActivityLogService activityLogService;

	@Operation(summary = "Get activity logs for a specific workspace")
	@GetMapping("/workspace/{workspaceId}")
	public ResponseEntity<Slice<ActivityLogResponse>> getWorkspaceLogs(
			@PathVariable UUID workspaceId,
			@PageableDefault(size = 20) Pageable pageable,
			Principal principal) {

		Slice<ActivityLogResponse> logs = activityLogService.getWorkspaceLogs(workspaceId,
				principal.getName(),
				pageable);
		return ResponseEntity.ok(logs);
	}

	@Operation(summary = "Get activity logs for a specific user")
	@GetMapping("/user/{targetUserId}")
	public ResponseEntity<Slice<ActivityLogResponse>> getUserLogs(
			@PathVariable UUID targetUserId,
			@PageableDefault(size = 20) Pageable pageable,
			Principal principal) {

		Slice<ActivityLogResponse> logs = activityLogService.getUserLogs(targetUserId, principal.getName(), pageable);
		return ResponseEntity.ok(logs);
	}

	@Operation(summary = "Get activity logs for a specific entity (e.g. Task)")
	@GetMapping("/entity/{entityId}")
	public ResponseEntity<Slice<ActivityLogResponse>> getEntityLogs(
			@PathVariable UUID entityId,
			@RequestParam UUID workspaceId,
			@PageableDefault(size = 20) Pageable pageable,
			Principal principal) {
		
		Slice<ActivityLogResponse> logs = activityLogService.getEntityLogs(entityId, workspaceId, principal.getName(), pageable);
		return ResponseEntity.ok(logs);
	}
}
