package com.teampulse.backend.controller;

import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Tag(name = "Public API", description = "Public endpoints protected by X-API-KEY header")
public class PublicApiController {
	private final UserRepository userRepository;
	private final TaskRepository taskRepository;
	private final WorkspaceRepository workspaceRepository;

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

	@Operation(summary = "Get public tasks summary")
	@GetMapping("/tasks")
	public ResponseEntity<Map<String, Object>> getPublicTasks() {
		return ResponseEntity.ok(Map.of(
				"totalTasksCount", taskRepository.count(),
				"message", "Public task access authorized"
		));
	}

	@Operation(summary = "Get public users summary")
	@GetMapping("/users")
	public ResponseEntity<Map<String, Object>> getPublicUsers() {
		return ResponseEntity.ok(Map.of(
				"totalUsersCount", userRepository.count(),
				"message", "Public user access authorized"
		));
	}

	@Operation(summary = "Get public organizations summary")
	@GetMapping("/organizations")
	public ResponseEntity<Map<String, Object>> getPublicOrganizations() {
		return ResponseEntity.ok(Map.of(
				"totalOrganizationsCount", workspaceRepository.count(),
				"message", "Public organizations access authorized"
		));
	}

	@Operation(summary = "Get public chat status gateway")
	@GetMapping("/chat")
	public ResponseEntity<Map<String, String>> getPublicChat() {
		return ResponseEntity.ok(Map.of(
				"service", "Team-Pulse Chat Gateway"
		));
	}
}
