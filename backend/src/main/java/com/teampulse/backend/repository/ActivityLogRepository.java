package com.teampulse.backend.repository;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.ActivityLog;


public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
	Slice<ActivityLog> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId, Pageable pageable);
	Slice<ActivityLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
	Slice<ActivityLog> findByEntityIdOrderByCreatedAtDesc(UUID entityId, Pageable pageable);
}
