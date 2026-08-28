package com.teampulse.backend.dto.request;

import com.teampulse.backend.enums.WorkspaceMemberRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class WorkspaceMemberRoleUpdateRequest {
	@NotBlank(message = "User email cannot be empty")
    @Email(message = "Please provide a valid email address")
    private String email;

	@NotNull(message="Member role is required (ADMIN or MEMBER or VIEWER)")
	private WorkspaceMemberRole role;
}
