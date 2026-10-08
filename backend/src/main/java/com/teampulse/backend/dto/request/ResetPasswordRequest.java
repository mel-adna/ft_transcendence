package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

	@NotBlank(message = "Reset token is required")
	private String token;

	@NotBlank(message = "New password cannot be blank")
	@Size(min = 8, message = "New password must be at least 8 characters long")
	@Pattern(
			regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$",
			message = "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
	)
	private String newPassword;
}
