package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

public class ResendVerificationRequest {
    @NotBlank(message="Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100)
    private String email;
}