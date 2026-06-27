package com.teampulse.backend.repository;


import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.ChatMessage;


public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
	Slice<ChatMessage> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId, Pageable pageable);
}
