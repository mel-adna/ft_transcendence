package com.teampulse.backend.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TaskCommentResponse {
	private UUID id;
	private UUID taskId;
	private UserResponse author;
	private String content;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
}
