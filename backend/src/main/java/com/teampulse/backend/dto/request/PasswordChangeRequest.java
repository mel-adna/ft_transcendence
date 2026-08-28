package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PasswordChangeRequest {
	@NotBlank(message="Current password is required")
	@Size(max=255, message="Current password must not exceed 255 characters")
	private String currentPassword;

	@NotBlank(message="New password is required")
	@Size(min=8, message="New password must be at least 8 characters long")
	@Size(max=255, message="New password must not exceed 255 characters")
	private String newPassword;
}
