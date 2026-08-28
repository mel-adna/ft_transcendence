package com.teampulse.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.WorkspaceMemberId;


public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, WorkspaceMemberId>{
	List<WorkspaceMember> findByWorkspaceId(UUID workspaceId);
    List<WorkspaceMember> findByUserId(UUID userId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    void deleteByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

	List<WorkspaceMember> findByUserEmail(String email);
    boolean existsByWorkspaceIdAndUserEmail(UUID workspaceId, String email);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserEmail(UUID workspaceId, String email);
}
