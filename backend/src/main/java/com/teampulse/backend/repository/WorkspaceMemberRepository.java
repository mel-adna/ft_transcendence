package com.teampulse.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.teampulse.backend.enums.WorkspaceMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.WorkspaceMemberId;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, WorkspaceMemberId> {

	@Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.user WHERE m.workspace.id = :workspaceId AND m.workspace.deleted = false")
	List<WorkspaceMember> findByWorkspaceIdWithUser(@Param("workspaceId") UUID workspaceId);

	@Query("SELECT m FROM WorkspaceMember m WHERE m.workspace.id = :workspaceId AND m.workspace.deleted = false")
	List<WorkspaceMember> findByWorkspaceId(@Param("workspaceId") UUID workspaceId);

	@Query("SELECT COUNT(m) > 0 FROM WorkspaceMember m WHERE m.workspace.id = :workspaceId AND LOWER(m.user.email) = LOWER(:email) AND m.workspace.deleted = false")
	boolean existsByWorkspaceIdAndUserEmail(@Param("workspaceId") UUID workspaceId, @Param("email") String email);

	@Query("SELECT m FROM WorkspaceMember m WHERE m.workspace.id = :workspaceId AND LOWER(m.user.email) = LOWER(:email) AND m.workspace.deleted = false")
	Optional<WorkspaceMember> findByWorkspaceIdAndUserEmail(@Param("workspaceId") UUID workspaceId, @Param("email") String email);

	@Query("SELECT COUNT(m) FROM WorkspaceMember m WHERE m.workspace.id = :workspaceId AND m.workspace.deleted = false")
	long countByWorkspaceId(@Param("workspaceId") UUID workspaceId);

	boolean existsByWorkspaceIdAndUserIdNotAndRole(UUID workspaceId, UUID userId, WorkspaceMemberRole role);

	Optional<WorkspaceMember> findFirstByWorkspaceIdAndUserIdNotAndRoleOrderByCreatedAtAsc(UUID workspaceId, UUID userId, WorkspaceMemberRole role);

	void deleteByUserId(UUID userId);

	@Query("SELECT m FROM WorkspaceMember m WHERE LOWER(m.user.email) = LOWER(:userEmail) AND m.workspace.deleted = false")
	List<WorkspaceMember> findByUserEmail(@Param("userEmail") String userEmail);

	@Query("SELECT m.workspace.id FROM WorkspaceMember m WHERE LOWER(m.user.email) = LOWER(:email) AND m.workspace.deleted = false")
	List<UUID> findWorkspaceIdsByUserEmail(@Param("email") String email);
}
