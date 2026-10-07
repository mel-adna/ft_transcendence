package com.teampulse.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.Task;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
	Page<Task> findByWorkspaceId(UUID workspaceId, Pageable pageable);

	List<Task> findByWorkspaceId(UUID workspaceId);

	@Modifying
	@Query("UPDATE Task t SET t.assignee = NULL WHERE t.assignee.id = :userId")
	void unassignTasksByUserId(@Param("userId") UUID userId);
}