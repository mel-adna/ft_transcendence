package com.teampulse.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.teampulse.backend.enums.WorkspaceMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.WorkspaceMemberId;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;


@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, WorkspaceMemberId>{
	List<WorkspaceMember> findByWorkspaceId(UUID workspaceId);
    boolean existsByWorkspaceIdAndUserEmail(UUID workspaceId, String email);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserEmail(UUID workspaceId, String email);

	long countByWorkspaceId(UUID workspaceId);
	boolean existsByWorkspaceIdAndUserIdNotAndRole(UUID workspaceId, UUID userId, WorkspaceMemberRole role);
	Optional<WorkspaceMember> findFirstByWorkspaceIdAndUserIdNotAndRoleOrderByCreatedAtAsc(UUID workspaceId, UUID userId, WorkspaceMemberRole role);
}
