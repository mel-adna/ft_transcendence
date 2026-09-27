package com.teampulse.backend.repository;

import com.teampulse.backend.enums.InvitationStatus;
import com.teampulse.backend.model.WorkspaceInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Repository
public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, UUID> {
	List<WorkspaceInvitation> findByInviteeEmail(String email);

	List<WorkspaceInvitation> findByInviteeEmailAndStatus(String email, InvitationStatus status);

	boolean existsByWorkspaceIdAndInviteeEmailAndStatus(UUID workspaceId, String inviteeEmail, InvitationStatus status);

	Optional<WorkspaceInvitation> findByWorkspaceIdAndInviteeEmailAndStatus(UUID workspaceId, String inviteeEmail, InvitationStatus status);

	List<WorkspaceInvitation> findByWorkspaceId(UUID workspaceId);
}
