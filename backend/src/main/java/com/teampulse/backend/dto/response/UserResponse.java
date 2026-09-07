package com.teampulse.backend.dto.response;

import java.util.UUID;

import com.google.auto.value.AutoValue.Builder;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
@lombok.Builder 
public class UserResponse {
	private UUID id;
	private String firstName;
	private String lastName;
	private String avatarUrl;
	private String email;
}
