package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceInvitation;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;


@Getter
public class WorkspaceInvitationSentEvent extends ApplicationEvent {
	private final EventSnapshots.WorkspaceValue workspace;
	private final EventSnapshots.InvitationValue invitation;
	private final EventSnapshots.UserValue inviter;
	private final EventSnapshots.UserValue invitee;
	private final Instant timeAt;

	public WorkspaceInvitationSentEvent(Object source, Workspace workspace,
	                                    WorkspaceInvitation invitation, User inviter,
	                                    User invitee) {
		super(source);
		this.workspace = EventSnapshots.WorkspaceValue.of(workspace);
		this.invitation = EventSnapshots.InvitationValue.of(invitation);
		this.inviter = EventSnapshots.UserValue.of(inviter);
		this.invitee = EventSnapshots.UserValue.of(invitee);
		this.timeAt = Instant.now();
	}
}
