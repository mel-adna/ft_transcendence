package com.teampulse.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teampulse.backend.model.Workspace;


public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
	List<Workspace> findByOwnerId(UUID id);
	boolean existsByNameAndOwnerId(String name, UUID ownerId);
	Optional<Workspace> findByNameAndOwnerId(String name, UUID ownerId);

	// @Query("SELECT m.workspace FROM WorkspaceMember m WHERE m.user.email = :email")
	@Query("SELECT m.workspace FROM WorkspaceMember m WHERE m.user.email = :email AND m.workspace.deleted = false")
    List<Workspace> findAllByMembersUserEmail(@Param("email") String email);

	@Modifying
    @Query("UPDATE Workspace w SET w.deleted = true, w.updatedAt = CURRENT_TIMESTAMP WHERE w.id = :id")
    void softDeleteById(@Param("id") UUID id);
}
