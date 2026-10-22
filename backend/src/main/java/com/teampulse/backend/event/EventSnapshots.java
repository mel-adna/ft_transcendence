package com.teampulse.backend.event;

import com.teampulse.backend.model.*;
import com.teampulse.backend.enums.TaskStatus;
import java.util.UUID;

/** Immutable internal event values, captured while the publishing transaction is active. */
public final class EventSnapshots {
	private EventSnapshots() {}
	public record UserValue(UUID id, String firstName, String lastName, String email) {
		public static UserValue of(User user) { return user == null ? null : new UserValue(user.getId(), user.getFirstName(), user.getLastName(), user.getEmail()); }
	}
	public record WorkspaceValue(UUID id, String name, Long version) {
		public static WorkspaceValue of(Workspace workspace) { return new WorkspaceValue(workspace.getId(), workspace.getName(), workspace.getVersion()); }
	}
	public record TaskValue(UUID id, Long version, TaskStatus status) {
		public static TaskValue of(Task task) { return new TaskValue(task.getId(), task.getVersion(), task.getStatus()); }
	}
	public record InvitationValue(UUID id, String inviteeEmail, UserValue inviter) {
		public static InvitationValue of(WorkspaceInvitation value) { return new InvitationValue(value.getId(), value.getInviteeEmail(), UserValue.of(value.getInviter())); }
	}
}
