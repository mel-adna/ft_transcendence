package com.teampulse.backend.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChatMessageResponse {
	private UUID id;
	private UUID workspaceId;
	private UUID senderId;
	private String senderName;
	private String senderAvatar;
	private String content;
	private LocalDateTime createdAt;
}
