package com.teampulse.backend.service;

import java.util.*;
import java.util.stream.Collectors;

import com.teampulse.backend.event.WorkspaceDeletedEvent;
import com.teampulse.backend.event.WorkspaceMemberAddedEvent;
import com.teampulse.backend.event.WorkspaceMemberRemovedEvent;
import com.teampulse.backend.event.WorkspaceUpdatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teampulse.backend.dto.request.WorkspaceCreateRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberAddRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberRoleUpdateRequest;
import com.teampulse.backend.dto.request.WorkspaceUpdateRequest;
import com.teampulse.backend.dto.response.WorkspaceMemberResponse;
import com.teampulse.backend.dto.response.WorkspaceResponse;
import com.teampulse.backend.enums.WorkspaceMemberRole;
import com.teampulse.backend.enums.WorkspaceType;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.WorkspaceMapper;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.WorkspaceMemberId;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class WorkspaceService {
	private final WorkspaceRepository workspaceRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final UserRepository userRepository;
	private final WorkspaceMapper workspaceMapper;
	private final ApplicationEventPublisher eventPublisher;

	@Transactional
	public WorkspaceResponse createWorkspace(String creatorEmail, WorkspaceCreateRequest request) {
		User creator = userRepository.findByEmail(creatorEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		boolean nameExits = workspaceRepository.existsByUserIdAndWorkspaceName(creator.getId(), request.getName());
		if (nameExits)
			throw new BadRequestException("You already own or belong to a workspace with the name: " + request.getName());

		Workspace workspace = new Workspace();
		workspace.setName(request.getName());
		workspace.setDescription(request.getDescription());
		workspace.setType(request.getType());
		workspace.setOwner(creator);

		Workspace savedWorkspace = workspaceRepository.save(workspace);

		WorkspaceMemberId memberId = new WorkspaceMemberId(savedWorkspace.getId(), creator.getId());
		WorkspaceMember admin = new WorkspaceMember();
		admin.setId(memberId);
		admin.setWorkspace(savedWorkspace);
		admin.setUser(creator);
		admin.setRole(WorkspaceMemberRole.ADMIN);

		workspaceMemberRepository.save(admin);

		return workspaceMapper.toResponse(savedWorkspace);
	}

	@Transactional(readOnly = true)
	public List<WorkspaceResponse> getAllWorkSpaceForUser(String email) {
		List<Workspace> workspaces = workspaceRepository.findAllByMembersUserEmail(email);

		Map<String, Long> nameCounts = workspaces.stream()
				.collect(Collectors.groupingBy(Workspace::getName, Collectors.counting()));

		Map<String, Integer> nameOccurrences = new HashMap<>();

		return workspaces.stream().map(ws -> {
			WorkspaceResponse wsResponse = workspaceMapper.toResponse(ws);

			String originalName = ws.getName();

			if (nameCounts.get(originalName) > 1) {
				int occurrence = nameOccurrences.getOrDefault(originalName, 0) + 1;
				nameOccurrences.put(originalName, occurrence);

				if (occurrence > 1) {
					return wsResponse.toBuilder()
							.name(originalName + "(" + occurrence + ")")
							.build();
				}
			}
			return wsResponse;
		}).collect(Collectors.toList());
	}

	@Transactional(readOnly = true)
	public WorkspaceResponse getWorkspaceById(UUID workspaceId, String email) {

		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, email);

		if (!isMember)
			throw new UnauthorizedAccessException("Access denied. You are not a member of this workspace.");

		Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow(() -> new ResourceNotFoundException("Workspace not found with ID: " + workspaceId));

		return workspaceMapper.toResponse(workspace);
	}


	@Transactional(readOnly = true)
	public List<WorkspaceMemberResponse> getWorkspaceMembers(UUID workspaceId) {
		List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);

		return members.stream()
				.map(workspaceMapper::toMemberResponse)
				.toList();
	}


	@Transactional
	public WorkspaceResponse updateWorkspace(UUID workspaceId, String email, WorkspaceUpdateRequest request) {
		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		verifyUserIsAdmin(workspaceId, email);

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));

		User admin = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!workspace.getName().equalsIgnoreCase(request.getName())) {
			boolean nameExits = workspaceRepository.existsByUserIdAndWorkspaceName(admin.getId(), request.getName());
			if (nameExits)
				throw new BadRequestException("You already have another workspace with the name: " + request.getName());
		}

		workspace.setName(request.getName());
		workspace.setDescription(request.getDescription());
		workspace.setType(request.getType());

		Workspace updatedWorkspace = workspaceRepository.save(workspace);

		eventPublisher.publishEvent(new WorkspaceUpdatedEvent(this, updatedWorkspace, admin));

		return workspaceMapper.toResponse(updatedWorkspace);
	}

	@Transactional
	public void deleteWorkspace(UUID workspaceId, String email) {
		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));

		verifyUserIsAdmin(workspaceId, email);

		List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);
		List<UUID> memberIds = members.stream()
				.map(m -> m.getUser().getId())
				.toList();

		String workspaceName = workspace.getName();

		User admin = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		workspaceRepository.softDeleteById(workspaceId);

		eventPublisher.publishEvent(new WorkspaceDeletedEvent(this, workspaceId, workspaceName, admin, memberIds));

		log.info("Workspace with ID: {} has been soft-deleted successfully.", workspaceId);
	}

	@Transactional
	public void addMemberToWorkspace(UUID workspaceId, String adminEmail, WorkspaceMemberAddRequest request) {
		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		verifyUserIsAdmin(workspaceId, adminEmail);

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));

		if (workspace.getType() == WorkspaceType.PERSONAL) {
			throw new BadRequestException("Cannot add members to a personal workspace.");
		}

		User newUser = userRepository.findByEmail(request.getEmail())
				.orElseThrow(() -> new ResourceNotFoundException("User to add not found"));

		WorkspaceMemberId newUserId = new WorkspaceMemberId(workspaceId, newUser.getId());

		if (workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, request.getEmail()))
			throw new BadRequestException("User is already a member of this workspace.");

		WorkspaceMember newMember = new WorkspaceMember();
		newMember.setId(newUserId);
		newMember.setWorkspace(workspace);
		newMember.setUser(newUser);
		newMember.setRole(request.getRole() != null ? request.getRole() : WorkspaceMemberRole.MEMBER);

		workspaceMemberRepository.save(newMember);

		User admin = userRepository.findByEmail(adminEmail).orElse(null);
		eventPublisher.publishEvent(new WorkspaceMemberAddedEvent(this, workspace, newUser, admin));
	}

	@Transactional
	public void updateMemberRole(UUID workspaceId, String adminEmail, WorkspaceMemberRoleUpdateRequest request) {
		verifyUserIsAdmin(workspaceId, adminEmail);

		WorkspaceMember memberShip = workspaceMemberRepository.findByWorkspaceIdAndUserEmail(workspaceId, request.getEmail())
				.orElseThrow(() -> new ResourceNotFoundException("User is not a member of this workspace"));

		memberShip.setRole(request.getRole());
		workspaceMemberRepository.save(memberShip);
	}

	@Transactional
	public void removeMemberFromWorkspace(UUID workspaceId, String adminEmail, String memberEmail) {
		verifyUserIsAdmin(workspaceId, adminEmail);

		if (adminEmail.equals(memberEmail))
			throw new BadRequestException("Admins cannot remove themselves from the workspace. Delete the workspace instead.");

		WorkspaceMember memberShip = workspaceMemberRepository.findByWorkspaceIdAndUserEmail(workspaceId, memberEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User is not a member of this workspace"));

		Workspace workspace = memberShip.getWorkspace();
		User removedUser = memberShip.getUser();
		User admin = userRepository.findByEmail(adminEmail).orElse(null);

		workspaceMemberRepository.delete(Objects.requireNonNull(memberShip));

		eventPublisher.publishEvent(new WorkspaceMemberRemovedEvent(this, workspace, removedUser, admin));

		log.info("User {} was removed from workspace {} by admin {}", memberEmail, workspace.getName(), adminEmail);
	}

	private void verifyUserIsAdmin(UUID workspaceId, String email) {
		WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserEmail(workspaceId, email)
				.orElseThrow(() -> new UnauthorizedAccessException("Access denied. You are not part of this workspace."));

		if (member.getRole() != WorkspaceMemberRole.ADMIN)
			throw new UnauthorizedAccessException("Only workspace ADMINs can perform this action!");
	}
}
