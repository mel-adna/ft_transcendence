package com.teampulse.backend.dto.response;

import java.util.UUID;

import com.teampulse.backend.model.enums.WorkspaceType;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class WorkspaceResponse {
	private UUID id;
	private String name;
	private WorkspaceType type;
	private UserResponse owner;
}
