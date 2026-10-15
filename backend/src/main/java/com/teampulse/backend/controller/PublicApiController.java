package com.teampulse.backend.controller;

import com.teampulse.backend.dto.request.TaskCreateRequest;
import com.teampulse.backend.dto.request.TaskUpdateRequest;
import com.teampulse.backend.dto.response.TaskResponse;
import com.teampulse.backend.dto.response.WorkspaceResponse;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceRepository;
import com.teampulse.backend.security.ratelimit.RateLimit;
import com.teampulse.backend.security.ratelimit.RateLimitKeyType;
import com.teampulse.backend.service.TaskService;
import com.teampulse.backend.service.WorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Tag(name = "Public API", description = "Public endpoints protected by X-API-KEY header")
@SecurityRequirement(name = "X-API-KEY")
public class PublicApiController {

	private final UserRepository userRepository;
	private final TaskRepository taskRepository;
	private final WorkspaceRepository workspaceRepository;
	private final WorkspaceService workspaceService;
	private final TaskService taskService;


	@RateLimit(capacity = 30, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Get system status and stats")
	@GetMapping("/stats")
	public ResponseEntity<Map<String, Object>> getPublicStats() {
		return ResponseEntity.ok(Map.of(
				"status", "healthy",
				"totalTasks", taskRepository.count(),
				"totalUsers", userRepository.count(),
				"totalOrganizations", workspaceRepository.count()
		));
	}

	@RateLimit(capacity = 60, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Get public users summary")
	@GetMapping("/users")
	public ResponseEntity<Map<String, Object>> getPublicUsers() {
		return ResponseEntity.ok(Map.of(
				"totalUsersCount", userRepository.count(),
				"message", "Public user access authorized"
		));
	}

	@RateLimit(capacity = 60, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Get public organizations summary")
	@GetMapping("/organizations")
	public ResponseEntity<Map<String, Object>> getPublicOrganizations() {
		return ResponseEntity.ok(Map.of(
				"totalOrganizationsCount", workspaceRepository.count(),
				"message", "Public organizations access authorized"
		));
	}

	@RateLimit(capacity = 60, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Get public chat status gateway")
	@GetMapping("/chat")
	public ResponseEntity<Map<String, String>> getPublicChat() {
		return ResponseEntity.ok(Map.of(
				"service", "Team-Pulse Chat Gateway"
		));
	}


	@RateLimit(capacity = 60, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Get workspaces/teams of the API Key owner", description = "Returns all workspaces where the authenticated API key owner is a member.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Workspaces retrieved successfully"),
			@ApiResponse(responseCode = "401", description = "Invalid or missing X-API-KEY header")
	})
	@GetMapping("/workspaces")
	public ResponseEntity<List<WorkspaceResponse>> getPublicWorkspaces(@Parameter(hidden = true) Principal principal) {
		List<WorkspaceResponse> workspaces = workspaceService.getAllWorkSpaceForUser(principal.getName());
		return ResponseEntity.ok(workspaces);
	}

	@RateLimit(capacity = 60, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Get tasks of a specific workspace", description = "Retrieves tasks in a workspace if the API Key owner is a member.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Tasks retrieved successfully"),
			@ApiResponse(responseCode = "401", description = "Unauthorized or missing X-API-KEY header"),
			@ApiResponse(responseCode = "403", description = "User is not a member of the workspace")
	})
	@GetMapping("/tasks")
	public ResponseEntity<Page<TaskResponse>> getPublicWorkspaceTasks(
			@RequestParam(name = "workspaceId") UUID workspaceId,
			@RequestParam(name = "page", defaultValue = "0") int page,
			@RequestParam(name = "size", defaultValue = "20") int size,
			@Parameter(hidden = true) Principal principal) {

		Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
		Page<TaskResponse> tasks = taskService.getWorkspaceTasks(workspaceId, principal.getName(), pageable);
		return ResponseEntity.ok(tasks);
	}

	@RateLimit(capacity = 30, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Create a new task in a workspace", description = "Creates a new task in a workspace on behalf of the API Key owner.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Task created successfully", content = @Content(schema = @Schema(implementation = TaskResponse.class))),
			@ApiResponse(responseCode = "400", description = "Invalid request or missing parameters"),
			@ApiResponse(responseCode = "401", description = "Unauthorized or missing X-API-KEY header"),
			@ApiResponse(responseCode = "403", description = "Insufficient workspace permissions (e.g. Viewer role)")
	})
	@PostMapping("/tasks")
	public ResponseEntity<TaskResponse> createPublicTask(
			@RequestParam(name = "workspaceId") UUID workspaceId,
			@Valid @RequestBody TaskCreateRequest request,
			@Parameter(hidden = true) Principal principal) {

		TaskResponse createdTask = taskService.createTask(workspaceId, principal.getName(), request);
		return ResponseEntity.status(HttpStatus.CREATED).body(createdTask);
	}

	@RateLimit(capacity = 30, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Update an existing task", description = "Updates task details (title, description, status, priority, assignee) if permitted.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Task updated successfully", content = @Content(schema = @Schema(implementation = TaskResponse.class))),
			@ApiResponse(responseCode = "400", description = "Invalid request payload"),
			@ApiResponse(responseCode = "401", description = "Unauthorized or missing X-API-KEY header"),
			@ApiResponse(responseCode = "403", description = "User not allowed to update this task"),
			@ApiResponse(responseCode = "404", description = "Task not found")
	})
	@PutMapping("/tasks/{id}")
	public ResponseEntity<TaskResponse> updatePublicTask(
			@PathVariable(name = "id") UUID taskId,
			@Valid @RequestBody TaskUpdateRequest request,
			@Parameter(hidden = true) Principal principal) {

		TaskResponse updatedTask = taskService.updateTask(taskId, principal.getName(), request);
		return ResponseEntity.ok(updatedTask);
	}

	@RateLimit(capacity = 30, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
	@Operation(summary = "Delete a task", description = "Deletes a task if the API Key owner is a workspace ADMIN or the task creator.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Task deleted successfully"),
			@ApiResponse(responseCode = "401", description = "Unauthorized or missing X-API-KEY header"),
			@ApiResponse(responseCode = "403", description = "Only workspace ADMINs or task creators can delete tasks"),
			@ApiResponse(responseCode = "404", description = "Task not found")
	})
	@DeleteMapping("/tasks/{id}")
	public ResponseEntity<Void> deletePublicTask(
			@PathVariable(name = "id") UUID taskId,
			@Parameter(hidden = true) Principal principal) {

		taskService.deleteTask(taskId, principal.getName());
		return ResponseEntity.noContent().build();
	}
}