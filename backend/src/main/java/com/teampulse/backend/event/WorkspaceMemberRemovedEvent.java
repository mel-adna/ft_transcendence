package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;

@Getter
public class WorkspaceMemberRemovedEvent extends ApplicationEvent {
	private final EventSnapshots.WorkspaceValue workspace;
	private final EventSnapshots.UserValue removedUser;
	private final EventSnapshots.UserValue admin;
	private final Instant timeAt;

	public WorkspaceMemberRemovedEvent(Object source, Workspace workspace, User removedUser, User admin) {
		super(source);
		this.workspace = EventSnapshots.WorkspaceValue.of(workspace);
		this.removedUser = EventSnapshots.UserValue.of(removedUser);
		this.admin = EventSnapshots.UserValue.of(admin);
		this.timeAt = Instant.now();
	}
}
