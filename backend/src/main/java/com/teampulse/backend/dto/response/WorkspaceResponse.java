package com.teampulse.backend.dto.response;

import java.util.UUID;

import com.teampulse.backend.model.enums.WorkspaceType;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class WorkspaceResponse {
	private final UUID id;
	private final String name;
	private final WorkspaceType type;
	private final UserResponse owner;
}
