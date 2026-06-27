package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SignupRequest {
	@NotBlank(message="First name is required")
	@Size(max=50, message="First name must not exceed 50 characters")
	private String firstName;

	@NotBlank(message="Last name is required")
	@Size(max=50, message="Last name must not exceed 50 characters")
	private String lastName;

	@NotBlank(message="Email is required")
	@Email(message="Invalid email format")
	@Size(max = 100, message = "Email must not exceed 100 characters")
	private String email;

	@NotBlank(message = "Password is required")
	@Size(min = 8, max = 255, message = "Password must be at least 8 characters long")
	@Pattern(
		regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$",
		message = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)"
	)
	private String password;
}
