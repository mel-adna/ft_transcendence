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
public class SendInvitationRequest {
	@NotBlank(message = "Email is required")
	@Email(message = "Invalid email format")
	private String email;

	@NotNull(message = "Role is required")
	private WorkspaceMemberRole role;
}
