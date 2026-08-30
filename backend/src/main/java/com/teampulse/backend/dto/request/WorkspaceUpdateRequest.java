package com.teampulse.backend.dto.request;

import com.teampulse.backend.enums.WorkspaceType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class WorkspaceUpdateRequest {
	@NotBlank(message="Workspace name cannot be empty")
    @Size(max=100, message="Workspace name must not exceed 100 characters")
    private String name;

	@Size(max=500, message="Workspace description must not exceed 500 characters")
    private String description;

    @NotNull(message="Workspace type cannot be null")
    private WorkspaceType type;

}
