package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceInvitation;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;


@Getter
public class WorkspaceInvitationSentEvent extends ApplicationEvent {
	private final Workspace workspace;
	private final WorkspaceInvitation invitation;
	private final User inviter;
	private final User invitee;
	private final Instant timeAt;

	public WorkspaceInvitationSentEvent(Object source, Workspace workspace,
	                                    WorkspaceInvitation invitation, User inviter,
	                                    User invitee) {
		super(source);
		this.workspace = workspace;
		this.invitation = invitation;
		this.inviter = inviter;
		this.invitee = invitee;
		this.timeAt = Instant.now();
	}
}
