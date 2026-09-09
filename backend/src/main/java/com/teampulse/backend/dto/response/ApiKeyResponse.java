package com.teampulse.backend.dto.response;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiKeyResponse {
	private String keyPrefix;
	private boolean active;
	private Instant lastUsedAt;
	private Instant createdAt;
}
