package com.teampulse.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDataExportDTO {

	private Instant exportedAt;
	private ProfileExportDTO profile;
	private List<TeamExportDTO> teams;
	private Map<String, List<TaskExportDTO>> tasks;
	private List<NotificationExportDTO> notifications;
	private List<ActivityLogExportDTO> activityLogs;
	private InvitationsExportDTO invitations;
	private List<ApiKeyExportDTO> apiKeys;

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ProfileExportDTO {
		private UUID id;
		private String firstName;
		private String lastName;
		private String email;
		private String avatarUrl;
		private String role;
		private boolean enabled;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class TeamExportDTO {
		private UUID id;
		private String name;
		private String description;
		private String type;
		private String myRole;
		private UserSummaryDTO owner;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class UserSummaryDTO {
		private UUID id;
		private String firstName;
		private String lastName;
		private String avatarUrl;
		private String email;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class TaskExportDTO {
		private UUID id;
		private UUID workspaceId;
		private String title;
		private String description;
		private String status;
		private String priority;
		private UserSummaryDTO assignee;
		private UserSummaryDTO creator;
		private Instant createdAt;
		private Instant updatedAt;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class NotificationExportDTO {
		private UUID id;
		private String type;
		private String entityType;
		private UUID entityId;
		private String message;
		private boolean isRead;
		private LocalDateTime createdAt;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ActivityLogExportDTO {
		private UUID id;
		private UUID workspaceId;
		private String action;
		private String description;
		private Instant createdAt;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class InvitationsExportDTO {
		private List<WorkspaceInvitationResponse> sent;
		private List<WorkspaceInvitationResponse> received;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ApiKeyExportDTO {
		private UUID id;
		private String name;
		private String keyPrefix;
		private boolean active;
		private Instant createdAt;
	}
}