package com.teampulse.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teampulse.backend.model.Workspace;
import org.springframework.stereotype.Repository;


@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
	List<Workspace> findByOwnerId(UUID id);

	@Query("SELECT m.workspace FROM WorkspaceMember m WHERE m.user.email = :email AND m.workspace.deleted = false")
	List<Workspace> findAllByMembersUserEmail(@Param("email") String email);

	@Modifying
	@Query("UPDATE Workspace w SET w.deleted = true, w.updatedAt = CURRENT_TIMESTAMP WHERE w.id = :id")
	void softDeleteById(@Param("id") UUID id);

	@Query("SELECT COUNT(w) > 0 FROM Workspace w WHERE w.owner.id = :userId AND LOWER(w.name) = LOWER(:name) AND w.deleted = false")
	boolean existsByUserIdAndWorkspaceName(@Param("userId") UUID userId, @Param("name") String name);
}
