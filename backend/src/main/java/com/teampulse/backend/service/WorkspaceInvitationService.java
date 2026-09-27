package com.teampulse.backend.service;

import com.teampulse.backend.dto.request.SendInvitationRequest;
import com.teampulse.backend.dto.response.WorkspaceInvitationResponse;
import com.teampulse.backend.enums.InvitationStatus;
import com.teampulse.backend.enums.WorkspaceMemberRole;
import com.teampulse.backend.enums.WorkspaceType;
import com.teampulse.backend.event.WorkspaceInvitationAcceptedEvent;
import com.teampulse.backend.event.WorkspaceInvitationSentEvent;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.WorkspaceInvitationMapper;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceInvitation;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.WorkspaceMemberId;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceInvitationRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class WorkspaceInvitationService {

	private final WorkspaceInvitationRepository invitationRepository;
	private final WorkspaceRepository workspaceRepository;
	private final UserRepository userRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final WorkspaceInvitationMapper invitationMapper;
	private final ApplicationEventPublisher eventPublisher;

	private static final int INVITATION_EXPIRY_DAYS = 7;


	@Transactional
	public WorkspaceInvitationResponse sendInvitation(UUID workspaceId, SendInvitationRequest request, String inviterEmail) {
		if (workspaceId == null) {
			throw new BadRequestException("Workspace ID cannot be null");
		}

		verifyUserIsAdmin(workspaceId, inviterEmail);

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found with ID: " + workspaceId));

		if (workspace.getType() == WorkspaceType.PERSONAL) {
			throw new BadRequestException("Cannot invite members to a personal workspace.");
		}

		User inviter = userRepository.findByEmail(inviterEmail)
				.orElseThrow(() -> new ResourceNotFoundException("Inviter user not found"));

		User inviteeUser = userRepository.findByEmail(request.getEmail()).orElse(null);

		if (inviteeUser != null) {
			boolean isAlreadyMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, request.getEmail());
			if (isAlreadyMember) {
				throw new BadRequestException("User is already a member of this workspace.");
			}
		}

		boolean hasPendingInvite = invitationRepository.existsByWorkspaceIdAndInviteeEmailAndStatus(
				workspaceId, request.getEmail(), InvitationStatus.PENDING);
		if (hasPendingInvite) {
			throw new BadRequestException("A pending invitation already exists for this email.");
		}

		WorkspaceInvitation invitation = invitationMapper.toEntity(request);
		invitation.setWorkspace(workspace);
		invitation.setInviter(inviter);
		invitation.setStatus(InvitationStatus.PENDING);
		invitation.setCreatedAt(Instant.now());
		invitation.setExpiresAt(Instant.now().plus(INVITATION_EXPIRY_DAYS, ChronoUnit.DAYS));

		WorkspaceInvitation savedInvitation = invitationRepository.save(invitation);

		eventPublisher.publishEvent(new WorkspaceInvitationSentEvent(this, workspace, savedInvitation, inviter, inviteeUser));

		log.info("Invitation sent successfully to {} for workspace {}", request.getEmail(), workspace.getName());

		return invitationMapper.toResponse(savedInvitation);
	}


	@Transactional(readOnly = true)
	public List<WorkspaceInvitationResponse> getMyPendingInvitations(String userEmail) {
		return invitationRepository.findByInviteeEmailAndStatus(userEmail, InvitationStatus.PENDING)
				.stream()
				.filter(invitation -> invitation.getExpiresAt().isAfter(Instant.now()))
				.map(invitationMapper::toResponse)
				.collect(Collectors.toList());
	}


	@Transactional(readOnly = true)
	public List<WorkspaceInvitationResponse> getWorkspacePendingInvitations(UUID workspaceId, String adminEmail) {
		verifyUserIsAdmin(workspaceId, adminEmail);

		return invitationRepository.findByWorkspaceId(workspaceId)
				.stream()
				.map(invitationMapper::toResponse)
				.collect(Collectors.toList());
	}


	@Transactional
	public void acceptInvitation(UUID invitationId, String userEmail) {
		WorkspaceInvitation invitation = getValidPendingInvitation(invitationId, userEmail);

		User invitee = userRepository.findByEmail(userEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User account not found"));

		invitation.setStatus(InvitationStatus.ACCEPTED);
		invitationRepository.save(invitation);

		WorkspaceMemberId memberId = new WorkspaceMemberId(invitation.getWorkspace().getId(), invitee.getId());
		WorkspaceMember newMember = new WorkspaceMember();
		newMember.setId(memberId);
		newMember.setWorkspace(invitation.getWorkspace());
		newMember.setUser(invitee);
		newMember.setRole(invitation.getRole() != null ? invitation.getRole() : WorkspaceMemberRole.MEMBER);

		workspaceMemberRepository.save(newMember);

		eventPublisher.publishEvent(new WorkspaceInvitationAcceptedEvent(this, invitation.getWorkspace(), invitation, invitee));

		log.info("User {} accepted invitation to workspace {}", userEmail, invitation.getWorkspace().getName());
	}


	@Transactional
	public void rejectInvitation(UUID invitationId, String userEmail) {
		WorkspaceInvitation invitation = getValidPendingInvitation(invitationId, userEmail);

		invitation.setStatus(InvitationStatus.REJECTED);
		invitationRepository.save(invitation);

		log.info("User {} rejected invitation to workspace {}", userEmail, invitation.getWorkspace().getName());
	}


	@Transactional
	public void cancelInvitation(UUID workspaceId, UUID invitationId, String adminEmail) {
		verifyUserIsAdmin(workspaceId, adminEmail);

		WorkspaceInvitation invitation = invitationRepository.findById(invitationId)
				.orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

		if (!invitation.getWorkspace().getId().equals(workspaceId)) {
			throw new BadRequestException("Invitation does not belong to this workspace.");
		}

		if (invitation.getStatus() != InvitationStatus.PENDING) {
			throw new BadRequestException("Only pending invitations can be cancelled.");
		}

		invitationRepository.delete(invitation);

		log.info("Admin {} cancelled invitation {} for workspace {}", adminEmail, invitationId, workspaceId);
	}


	private WorkspaceInvitation getValidPendingInvitation(UUID invitationId, String userEmail) {
		WorkspaceInvitation invitation = invitationRepository.findById(invitationId)
				.orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

		if (!invitation.getInviteeEmail().equalsIgnoreCase(userEmail)) {
			throw new UnauthorizedAccessException("You are not authorized to respond to this invitation.");
		}

		if (invitation.getStatus() != InvitationStatus.PENDING) {
			throw new BadRequestException("Invitation is no longer pending.");
		}

		if (invitation.getExpiresAt().isBefore(Instant.now())) {
			invitation.setStatus(InvitationStatus.EXPIRED);
			invitationRepository.save(invitation);
			throw new BadRequestException("Invitation has expired.");
		}

		return invitation;
	}


	private void verifyUserIsAdmin(UUID workspaceId, String email) {
		WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserEmail(workspaceId, email)
				.orElseThrow(() -> new UnauthorizedAccessException("Access denied. You are not part of this workspace."));

		if (member.getRole() != WorkspaceMemberRole.ADMIN) {
			throw new UnauthorizedAccessException("Only workspace ADMINs can perform this action!");
		}
	}
}