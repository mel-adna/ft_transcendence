package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;

@Getter
public class WorkspaceUpdatedEvent extends ApplicationEvent {
	private final Workspace workspace;
	private final User user;
	private final Instant timeAt;

	public WorkspaceUpdatedEvent(Object source, Workspace workspace, User admin) {
		super(source);
		this.workspace = workspace;
		this.user = admin;
		this.timeAt = Instant.now();
	}
}
