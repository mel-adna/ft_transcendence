package com.teampulse.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {

    @NotBlank(message = "Email address cannot be blank")
    @Email(message = "Please provide a valid email address")
    @Size(max = 100, message = "Email address must not exceed 100 characters")
    private String email;
}