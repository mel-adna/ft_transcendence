package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;

@Getter
public class WorkspaceUpdatedEvent extends ApplicationEvent {
	private final EventSnapshots.WorkspaceValue workspace;
	private final EventSnapshots.UserValue user;
	private final Instant timeAt;

	public WorkspaceUpdatedEvent(Object source, Workspace workspace, User admin) {
		super(source);
		this.workspace = EventSnapshots.WorkspaceValue.of(workspace);
		this.user = EventSnapshots.UserValue.of(admin);
		this.timeAt = Instant.now();
	}
}
