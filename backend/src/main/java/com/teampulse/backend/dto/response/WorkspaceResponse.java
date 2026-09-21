package com.teampulse.backend.dto.response;

import java.util.UUID;

import com.teampulse.backend.enums.WorkspaceType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder(toBuilder = true)
public class WorkspaceResponse {
	private final UUID id;
	private final String name;
	private final String description;
	private final WorkspaceType type;
	private final UserResponse owner;
}
