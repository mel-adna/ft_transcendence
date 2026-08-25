package com.teampulse.backend.dto.response;

import java.time.Instant;
import java.util.UUID;

import com.teampulse.backend.model.enums.TaskPriority;
import com.teampulse.backend.model.enums.TaskStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TaskResponse {
	private UUID id;
	private UUID workspaceId;
	private String title;
	private String description;
	private TaskStatus status;
	private TaskPriority priority;
	private UserResponse assignee;
	private UserResponse creator;
	private Instant createdAt;
	private Instant updatedAt;
}
