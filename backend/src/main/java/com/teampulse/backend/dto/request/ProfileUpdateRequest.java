package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ProfileUpdateRequest {
	@NotBlank(message="First name is required")
	@Size(max=50, message="First name must not exceed 50 characters")
	private String firstName;

	@NotBlank(message="Last name is required")
	@Size(max=50, message="Last name must not exceed 50 characters")
	private String lastName;

	@Size(max=255, message = "Avatar URL must not exceed 255 characters")
	private String avatarUrl;
}
