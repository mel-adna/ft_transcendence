package com.teampulse.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teampulse.backend.model.Workspace;
import org.springframework.stereotype.Repository;


@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
	List<Workspace> findByOwnerId(UUID id);

	@Query("SELECT w.id FROM Workspace w WHERE w.owner.id = :userId")
	List<UUID> findIdsByOwnerId(@Param("userId") UUID userId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT w FROM Workspace w WHERE w.id = :id")
	Optional<Workspace> findForMembershipChange(@Param("id") UUID id);

	@Query("SELECT m.workspace FROM WorkspaceMember m WHERE m.user.email = :email AND m.workspace.deleted = false")
	List<Workspace> findAllByMembersUserEmail(@Param("email") String email);

	@Query("SELECT COUNT(w) > 0 FROM Workspace w WHERE w.owner.id = :userId AND LOWER(w.name) = LOWER(:name) AND w.deleted = false")
	boolean existsByUserIdAndWorkspaceName(@Param("userId") UUID userId, @Param("name") String name);
}
