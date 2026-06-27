package com.teampulse.backend.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teampulse.backend.dto.request.WorkspaceCreateRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberAddRequest;
import com.teampulse.backend.dto.request.WorkspaceMemberRoleUpdateRequest;
import com.teampulse.backend.dto.request.WorkspaceUpdateRequest;
import com.teampulse.backend.dto.response.WorkspaceResponse;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.WorkspaceMapper;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.WorkspaceMemberId;
import com.teampulse.backend.model.enums.WorkspaceMemberRole;
import com.teampulse.backend.model.enums.WorkspaceType;
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

	@Transactional
	public WorkspaceResponse createWorkspace(String creatorEmail, WorkspaceCreateRequest request) {
		User creator = userRepository.findByEmail(creatorEmail)
						.orElseThrow(() -> new ResourceNotFoundException("User not found"));

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

	@Transactional(readOnly=true)
    public List<WorkspaceResponse> getAllWorkSpaceForUser(String email) {

        List<Workspace> workspaces = workspaceRepository.findAllByMembersUserEmail(email);
        return workspaces.stream()
                .map(workspaceMapper::toResponse)
                .collect(Collectors.toList());
    }

	@Transactional(readOnly=true)
	public WorkspaceResponse getWorkspaceById(UUID workspaceId, String email) {

		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, email);

		if (!isMember)
			throw new UnauthorizedAccessException("Access denied. You are not a member of this workspace.");

		Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow(() -> new ResourceNotFoundException("Workspace not found with ID: " + workspaceId));

		return workspaceMapper.toResponse(workspace);
	}

	@Transactional
	public WorkspaceResponse updateWorkspace(UUID workspaceId, String email, WorkspaceUpdateRequest request) {
		if (workspaceId == null)
            throw new BadRequestException("Workspace ID cannot be null");

		verifyUserIsAdmin(workspaceId, email);

		Workspace workspace = workspaceRepository.findById(workspaceId)
								.orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));

		workspace.setName(request.getName());
		workspace.setDescription(request.getDescription());
		workspace.setType(request.getType());

		Workspace updatedWorkspace = workspaceRepository.save(workspace);

		return workspaceMapper.toResponse(updatedWorkspace);
	}

	@Transactional
	public void deleteWorkspace(UUID workspaceId, String email) {
		if (workspaceId == null)
            throw new BadRequestException("Workspace ID cannot be null");

		if (!workspaceRepository.existsById(workspaceId))
			throw new ResourceNotFoundException("Workspace not found");

		verifyUserIsAdmin(workspaceId, email);

		workspaceRepository.softDeleteById(workspaceId);
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
            throw new BadRequestException("Action denied: Cannot add members to a personal workspace.");
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

		workspaceMemberRepository.delete(Objects.requireNonNull(memberShip));
	}

	private void  verifyUserIsAdmin(UUID workspaceId, String email) {
	WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserEmail(workspaceId, email)
								.orElseThrow(() -> new UnauthorizedAccessException("Access denied. You are not part of this workspace."));

	if (member.getRole() != WorkspaceMemberRole.ADMIN)
		throw new UnauthorizedAccessException("Only workspace ADMINs can perform this action!");
	}
}
