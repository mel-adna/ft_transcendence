package com.teampulse.backend.service;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.teampulse.backend.dto.response.ActivityLogResponse;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.ActivityLogMapper;
import com.teampulse.backend.model.ActivityLog;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.ActivityLogRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ActivityLogService {
	private final ActivityLogRepository activityLogRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final UserRepository userRepository;
	private final WorkspaceRepository workspaceRepository;
	private final ActivityLogMapper activityLogMapper;

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void logActivity(UUID workspaceId, UUID userId, UUID entityId, String action, String description) {
		if (workspaceId == null || userId == null || action == null)
			throw new BadRequestException("Workspace ID, User ID, and Action are required for logging.");

		ActivityLog log = new ActivityLog();
		log.setActionType(action);
		log.setDescription(description);
		log.setEntityId(entityId);

		log.setWorkspace(workspaceRepository.getReferenceById(workspaceId));
		log.setUser(userRepository.getReferenceById(userId));
	
		activityLogRepository.save(log);
	}

	@Transactional(readOnly=true)
	public Slice<ActivityLogResponse> getWorkspaceLogs(UUID workspaceId, String email, Pageable pageable) {
		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		validateWorkspaceMemberShip(workspaceId, email);

		Slice<ActivityLog> logs = activityLogRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId, pageable);

		return logs.map(activityLogMapper::toResponse);
	}

	@Transactional(readOnly = true)
	public Slice<ActivityLogResponse> getUserLogs(UUID targetUserId, String currentEmail, Pageable pageable) {
		if (targetUserId == null)
            throw new BadRequestException("User ID cannot be null");
		
		User currentUser = userRepository.findByEmail(currentEmail)
							.orElseThrow(() -> new UnauthorizedAccessException("Current user not found."));

		if (!currentUser.getId().equals(targetUserId))
			throw new UnauthorizedAccessException("You are only allowed to view your own activity trail.");

		Slice<ActivityLog> logs = activityLogRepository.findByUserIdOrderByCreatedAtDesc(targetUserId, pageable);
		
		return  logs.map(activityLogMapper::toResponse);
	}


	@Transactional(readOnly = true)
    public Slice<ActivityLogResponse> getEntityLogs(UUID entityId, UUID workspaceId, String email, Pageable pageable) {
        if (entityId == null || workspaceId == null)
            throw new BadRequestException("Entity ID and Workspace ID cannot be null");

		validateWorkspaceMemberShip(workspaceId, email);

		Slice<ActivityLog> logs = activityLogRepository.findByEntityIdOrderByCreatedAtDesc(entityId, pageable);
        
        return logs.map(activityLogMapper::toResponse);
	}


	private void validateWorkspaceMemberShip(UUID workspaceId, String email) {
		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, email);
		if (!isMember)
			throw new UnauthorizedAccessException("Access denied. You do not have permission to view history for this workspace.");
	}
}
