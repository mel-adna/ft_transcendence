package com.teampulse.backend.dto.messaging;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;


@Data
@Builder
public class UnifiedEvent {
	private UUID eventId;
	private String type;      //    WORKSPACE  - CHAT - COMMENT
	private String action;           // CREATED   - DELETED -  COMPLETED
	private UUID recipientId;
	private UUID senderId;
	private String entityType;
	private String entityId;
	private Map<String, Object> payload;
	private Instant timestamp;
}
