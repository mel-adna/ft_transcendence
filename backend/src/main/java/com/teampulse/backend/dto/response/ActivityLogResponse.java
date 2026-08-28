package com.teampulse.backend.dto.response;

import java.time.Instant;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ActivityLogResponse {
	private UUID id;
	private UUID workspaceId;
	private UserResponse user;
	private String actionType;
	private String description;
	private UUID entityId;
	private Instant createdAt;
}
