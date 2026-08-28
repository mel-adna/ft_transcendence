package com.teampulse.backend.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NotificationResponse {
	private UUID id;
	private NotificationType type;
    private EntityType entityType;
    private UUID entityId;
    private String message;
    private boolean isRead;
	private LocalDateTime createdAt;
}
