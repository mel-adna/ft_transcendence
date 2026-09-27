package com.teampulse.backend.dto.response;

import com.teampulse.backend.enums.InvitationStatus;
import com.teampulse.backend.enums.WorkspaceMemberRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;


@Getter
@Setter
@AllArgsConstructor
public class WorkspaceInvitationResponse {
	private UUID id;
	private UUID workspaceId;
	private String workspaceName;
	private String inviterName;
	private String inviteeEmail;
	private WorkspaceMemberRole role;
	private InvitationStatus status;
	private Instant createdAt;
	private Instant expiresAt;
}
