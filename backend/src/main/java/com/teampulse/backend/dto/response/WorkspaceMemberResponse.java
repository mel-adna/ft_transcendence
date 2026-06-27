package com.teampulse.backend.dto.response;

import java.time.LocalDateTime;

import com.teampulse.backend.model.enums.WorkspaceMemberRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class WorkspaceMemberResponse {
	private UserResponse member;
	private WorkspaceMemberRole role;
	private LocalDateTime joinedAt;
}
