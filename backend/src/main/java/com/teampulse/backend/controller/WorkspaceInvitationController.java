package com.teampulse.backend.controller;

import org.springframework.web.bind.annotation.RestController;
import com.teampulse.backend.dto.request.SendInvitationRequest;
import com.teampulse.backend.dto.response.WorkspaceInvitationResponse;
import com.teampulse.backend.security.ratelimit.RateLimit;
import com.teampulse.backend.security.ratelimit.RateLimitKeyType;
import com.teampulse.backend.service.WorkspaceInvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/workspaces")
@RequiredArgsConstructor
@RateLimit(capacity = 20, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
@Tag(name = "Workspace Invitations", description = "Endpoints for managing workspace invitations (send, receive, accept, reject, and cancel)")
public class WorkspaceInvitationController {

	private final WorkspaceInvitationService invitationService;

	@PostMapping("/{workspaceId}/invitations")
	@Operation(summary = "Send workspace invitation", description = "Allows workspace ADMINs to send an invitation to a user by email.")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "201", description = "Invitation sent successfully"),
			@ApiResponse(responseCode = "400", description = "Invalid request, user already a member, or pending invitation exists"),
			@ApiResponse(responseCode = "403", description = "Access denied - Only workspace ADMINs can perform this action"),
			@ApiResponse(responseCode = "404", description = "Workspace or inviter not found"),
			@ApiResponse(responseCode = "429", description = "Too many requests - Rate limit exceeded")
	})
	public ResponseEntity<WorkspaceInvitationResponse> sendInvitation(
			@PathVariable UUID workspaceId,
			@Valid @RequestBody SendInvitationRequest request,
			Principal principal) {
		WorkspaceInvitationResponse response = invitationService.sendInvitation(workspaceId, request, principal.getName());
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@GetMapping("/{workspaceId}/invitations")
	@Operation(summary = "Get workspace invitations", description = "Retrieves all invitations sent for a specific workspace (ADMIN only).")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Workspace invitations retrieved successfully"),
			@ApiResponse(responseCode = "403", description = "Access denied - Only workspace ADMINs can perform this action"),
			@ApiResponse(responseCode = "404", description = "Workspace not found"),
			@ApiResponse(responseCode = "429", description = "Too many requests - Rate limit exceeded")
	})
	public ResponseEntity<List<WorkspaceInvitationResponse>> getWorkspaceInvitations(
			@PathVariable UUID workspaceId,
			Principal principal) {
		List<WorkspaceInvitationResponse> responses = invitationService.getWorkspacePendingInvitations(workspaceId, principal.getName());
		return ResponseEntity.ok(responses);
	}

	@DeleteMapping("/{workspaceId}/invitations/{invitationId}")
	@Operation(summary = "Cancel invitation", description = "Allows workspace ADMINs to cancel/revoke a pending invitation.")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "204", description = "Invitation cancelled successfully"),
			@ApiResponse(responseCode = "400", description = "Invitation is not pending or does not belong to this workspace"),
			@ApiResponse(responseCode = "403", description = "Access denied - Only workspace ADMINs can perform this action"),
			@ApiResponse(responseCode = "404", description = "Invitation not found"),
			@ApiResponse(responseCode = "429", description = "Too many requests - Rate limit exceeded")
	})
	public ResponseEntity<Void> cancelInvitation(
			@PathVariable UUID workspaceId,
			@PathVariable UUID invitationId,
			Principal principal) {
		invitationService.cancelInvitation(workspaceId, invitationId, principal.getName());
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/users/me/invitations")
	@Operation(summary = "Get my pending invitations", description = "Retrieves all active pending invitations for the currently logged-in user.")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Pending invitations retrieved successfully"),
			@ApiResponse(responseCode = "429", description = "Too many requests - Rate limit exceeded")
	})
	public ResponseEntity<List<WorkspaceInvitationResponse>> getMyPendingInvitations(Principal principal) {
		List<WorkspaceInvitationResponse> responses = invitationService.getMyPendingInvitations(principal.getName());
		return ResponseEntity.ok(responses);
	}

	@PostMapping("/invitations/{invitationId}/accept")
	@Operation(summary = "Accept invitation", description = "Allows a user to accept a pending invitation and join the workspace.")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Invitation accepted and user added to workspace"),
			@ApiResponse(responseCode = "400", description = "Invitation expired or invalid"),
			@ApiResponse(responseCode = "403", description = "Access denied - Invitation belongs to another user"),
			@ApiResponse(responseCode = "404", description = "Invitation not found"),
			@ApiResponse(responseCode = "429", description = "Too many requests - Rate limit exceeded")
	})
	public ResponseEntity<Void> acceptInvitation(
			@PathVariable UUID invitationId,
			Principal principal) {
		invitationService.acceptInvitation(invitationId, principal.getName());
		return ResponseEntity.ok().build();
	}

	@PostMapping("/invitations/{invitationId}/reject")
	@Operation(summary = "Reject invitation", description = "Allows a user to reject a pending invitation.")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Invitation rejected successfully"),
			@ApiResponse(responseCode = "400", description = "Invitation expired or invalid"),
			@ApiResponse(responseCode = "403", description = "Access denied - Invitation belongs to another user"),
			@ApiResponse(responseCode = "404", description = "Invitation not found"),
			@ApiResponse(responseCode = "429", description = "Too many requests - Rate limit exceeded")
	})
	public ResponseEntity<Void> rejectInvitation(
			@PathVariable UUID invitationId,
			Principal principal) {
		invitationService.rejectInvitation(invitationId, principal.getName());
		return ResponseEntity.ok().build();
	}
}