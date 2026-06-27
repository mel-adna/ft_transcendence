package com.teampulse.backend.dto.request;

import com.teampulse.backend.model.enums.WorkspaceMemberRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class WorkspaceMemberAddRequest {

	@NotBlank(message="Email is required")
	@Email(message="Invalid email format")
	@Size(max = 100, message = "Email must not exceed 100 characters")
	private String email;

	@NotNull(message="Member role is required (ADMIN or MEMBER or VIEWER)")
	private WorkspaceMemberRole role;
}
