package com.teampulse.backend.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.TaskComment;


public interface TaskCommentRepository extends JpaRepository<TaskComment, UUID> {
	Page<TaskComment> findByTaskIdOrderByCreatedAtDesc(UUID taskId, Pageable pageable);
}
