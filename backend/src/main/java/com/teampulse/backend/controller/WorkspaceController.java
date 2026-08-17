package com.teampulse.backend.controller;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teampulse.backend.dto.request.WorkspaceCreateRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberAddRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberRoleUpdateRequest;
import com.teampulse.backend.dto.request.WorkspaceUpdateRequest;
import com.teampulse.backend.dto.response.WorkspaceMemberResponse;
import com.teampulse.backend.dto.response.WorkspaceResponse;
import com.teampulse.backend.service.WorkspaceService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/workspaces")
@RequiredArgsConstructor
@Tag(name = "Workspace Management", description = "Endpoints for creating, managing, and governing team workspaces and their members.")
public class WorkspaceController {
	private final WorkspaceService workspaceService;

	@Operation(summary = "Create a new workspace", description = "Spins up a new PERSONAL or ORGANIZATION workspace. The authenticated creator is automatically assigned as the ADMIN.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Workspace created successfully"),
			@ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
			@ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT token")
	})
	@PostMapping
	public ResponseEntity<WorkspaceResponse> createWorkspace(@Valid @RequestBody WorkspaceCreateRequest request,
			Principal principal) {

		WorkspaceResponse response = workspaceService.createWorkspace(principal.getName(), request);
		return new ResponseEntity<>(response, HttpStatus.CREATED);
	}

	@Operation(summary = "Get all workspaces for current user", description = "Retrieves all workspaces where the currently authenticated user is a member.")
	@ApiResponse(responseCode = "200", description = "List of workspaces retrieved successfully")
	@GetMapping
	public ResponseEntity<List<WorkspaceResponse>> getAllWorkspaces(Principal principal) {
		List<WorkspaceResponse> workspace = workspaceService.getAllWorkSpaceForUser(principal.getName());
		return ResponseEntity.ok(workspace);
	}

	@Operation(summary = "Get workspace by ID", description = "Fetches details of a specific workspace. Requires the user to be a member of that workspace.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Workspace details retrieved successfully"),
			@ApiResponse(responseCode = "403", description = "Forbidden - User does not have access to this workspace"),
			@ApiResponse(responseCode = "404", description = "Workspace not found")
	})
	@GetMapping("/{workspaceId}")
	public ResponseEntity<WorkspaceResponse> getWorkspaceById(
			@Parameter(description = "UUID of the workspace to fetch") @PathVariable UUID workspaceId,
			Principal principal) {

		WorkspaceResponse workspace = workspaceService.getWorkspaceById(workspaceId, principal.getName());
		return ResponseEntity.ok(workspace);
	}

	@Operation(summary = "Get all members for this current workspace", description = "test test test")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "test"),
			@ApiResponse(responseCode = "400", description = "test"),
			@ApiResponse(responseCode = "403", description = "test")
	})
	@GetMapping("/{workspaceId}/members")
	public ResponseEntity<List<WorkspaceMemberResponse>> getWorkspaceMembers(
			@Parameter(description = "UUID of the workspace to fetch members for") @PathVariable UUID workspaceId,
			@Parameter(hidden = true) Principal principal) {

		List<WorkspaceMemberResponse> members = workspaceService.getWorkspaceMembers(workspaceId);

		return ResponseEntity.ok(members);
	}

	@Operation(summary = "Update a workspace", description = "Updates workspace name, description, and type. Restricted to workspace ADMINs only.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Workspace updated successfully"),
			@ApiResponse(responseCode = "403", description = "Forbidden - Only ADMINs can update workspace details"),
			@ApiResponse(responseCode = "404", description = "Workspace not found")
	})
	@PutMapping("/{workspaceId}")
	public ResponseEntity<WorkspaceResponse> updateWorkspace(
			@Parameter(description = "UUID of the workspace to update") @PathVariable UUID workspaceId,
			@Valid @RequestBody WorkspaceUpdateRequest request,
			Principal principal) {

		WorkspaceResponse update = workspaceService.updateWorkspace(workspaceId, principal.getName(), request);
		return ResponseEntity.ok(update);
	}

	@Operation(summary = "Delete a workspace", description = "Permanently deletes a workspace and all its memberships. Restricted to workspace ADMINs only.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "Workspace deleted successfully (No Content)"),
			@ApiResponse(responseCode = "403", description = "Forbidden - Only ADMINs can delete workspaces")
	})
	@DeleteMapping("/{workspaceId}")
	public ResponseEntity<Void> deleteWorkspace(
			@Parameter(description = "UUID of the workspace to delete") @PathVariable UUID workspaceId,
			Principal principal) {
		workspaceService.deleteWorkspace(workspaceId, principal.getName());
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Add a member to workspace", description = "Invites/Adds an existing user to the workspace. Restricted to workspace ADMINs.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Member added successfully"),
			@ApiResponse(responseCode = "400", description = "User is already a member or bad data"),
			@ApiResponse(responseCode = "403", description = "Forbidden - Action restricted to ADMINs")
	})
	@PostMapping("/{workspaceId}/members")
	public ResponseEntity<String> addMemberToWorkspace(
			@Parameter(description = "UUID of the workspace") @PathVariable UUID workspaceId,
			@Valid @RequestBody WorkspaceMemberAddRequest request,
			Principal principal) {

		workspaceService.addMemberToWorkspace(workspaceId, principal.getName(), request);
		return ResponseEntity.ok("Member added successfully to the workspace.");
	}

	@Operation(summary = "Update a member's role", description = "Changes a workspace member's role (e.g. from MEMBER to ADMIN). Restricted to workspace ADMINs.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Member role updated successfully"),
			@ApiResponse(responseCode = "403", description = "Forbidden - Action restricted to ADMINs")
	})
	@PutMapping("/{workspaceId}/members/role")
	public ResponseEntity<String> updateMemberRole(
			@Parameter(description = "UUID of the workspace") @PathVariable UUID workspaceId,
			@Valid @RequestBody WorkspaceMemberRoleUpdateRequest request,
			Principal principal) {

		workspaceService.updateMemberRole(workspaceId, principal.getName(), request);
		return ResponseEntity.ok("Member role updated successfully.");
	}

	@Operation(summary = "Remove a member from workspace", description = "Kicks out a member from the workspace. Members cannot remove themselves via this endpoint. Restricted to ADMINs.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Member removed successfully"),
			@ApiResponse(responseCode = "400", description = "Admin tried to remove themselves"),
			@ApiResponse(responseCode = "403", description = "Forbidden - Action restricted to ADMINs")
	})
	@DeleteMapping("/{workspaceId}/members/{memberEmail}")
	public ResponseEntity<String> deleteMemberFromWorkspace(
			@Parameter(description = "UUID of the workspace") @PathVariable UUID workspaceId,
			@Parameter(description = "Email of the member to be removed") @PathVariable String memberEmail,
			Principal principal) {

		workspaceService.removeMemberFromWorkspace(workspaceId, principal.getName(), memberEmail);
		return ResponseEntity.ok("Member has been removed successfully from the workspace.");
	}
}
