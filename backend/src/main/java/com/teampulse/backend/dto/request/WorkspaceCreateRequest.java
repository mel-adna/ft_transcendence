package com.teampulse.backend.dto.request;

import com.teampulse.backend.model.enums.WorkspaceType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class WorkspaceCreateRequest {

	@NotBlank(message="Workspace name is required")
	@Size(max=100, message="Workspace name must not exceed 100 characters")
	private String name;

	private String description;

	@NotNull(message="Workspace type is required (PERSONAL or ORGANIZATION)")
	private WorkspaceType type;
}
