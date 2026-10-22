package com.teampulse.backend.repository;

import com.teampulse.backend.enums.InvitationStatus;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.WorkspaceInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Repository
public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, UUID> {
	@Modifying(flushAutomatically = true)
	@org.springframework.data.jpa.repository.Query("UPDATE WorkspaceInvitation i SET i.status = com.teampulse.backend.enums.InvitationStatus.EXPIRED, i.version = i.version + 1 WHERE i.status = com.teampulse.backend.enums.InvitationStatus.PENDING AND i.expiresAt <= :now AND i.workspace.id = :workspaceId")
	int expirePendingForWorkspace(@org.springframework.data.repository.query.Param("now") Instant now,
	                              @org.springframework.data.repository.query.Param("workspaceId") UUID workspaceId);

	@Modifying(flushAutomatically = true)
	@org.springframework.data.jpa.repository.Query("UPDATE WorkspaceInvitation i SET i.status = com.teampulse.backend.enums.InvitationStatus.EXPIRED, i.version = i.version + 1 WHERE i.status = com.teampulse.backend.enums.InvitationStatus.PENDING AND i.expiresAt <= :now")
	int expirePending(@org.springframework.data.repository.query.Param("now") Instant now);

	List<WorkspaceInvitation> findByInviteeEmail(String email);

	List<WorkspaceInvitation> findByInviteeEmailAndStatus(String email, InvitationStatus status);

	boolean existsByWorkspaceIdAndInviteeEmailAndStatus(UUID workspaceId, String inviteeEmail, InvitationStatus status);

	Optional<WorkspaceInvitation> findByWorkspaceIdAndInviteeEmailAndStatus(UUID workspaceId, String inviteeEmail, InvitationStatus status);

	List<WorkspaceInvitation> findByWorkspaceId(UUID workspaceId);

	@Modifying
	void deleteByInviter(User inviter);

	@Modifying
	void deleteByInviterId(UUID inviterId);

	@Modifying
	void deleteByInviteeEmail(String email);

	List<WorkspaceInvitation> findByWorkspaceIdAndStatus(UUID workspaceId, InvitationStatus status);

	int deleteByStatusInAndCreatedAtBefore(List<InvitationStatus> statuses, Instant cutoff);

	void deleteByWorkspaceIdIn(Collection<UUID> workspaceIds);

	void deleteByWorkspaceId(UUID workspaceId);

	List<WorkspaceInvitation> findByInviterId(UUID inviterId);
}
