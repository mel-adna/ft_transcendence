package com.teampulse.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.enums.TaskPriority;
import com.teampulse.backend.model.enums.TaskStatus;


public interface TaskRepository extends JpaRepository<Task, UUID> {
	
	List<Task> findByWorkspaceId(UUID workspaceId);
	List<Task> findByWorkspaceIdAndStatus(UUID workspaceId, TaskStatus status);
	List<Task> findByAssigneeId(UUID assigneeId);
	List<Task> findByWorkspaceIdAndAssigneeId(UUID workspaceId, UUID assigneeId);
	List<Task> findByWorkspaceIdAndPriority(UUID workspaceId, TaskPriority priority);
	long countByWorkspaceIdAndStatus(UUID workspaceId, TaskStatus status);
}
