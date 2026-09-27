package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;

@Getter
public class WorkspaceMemberRemovedEvent extends ApplicationEvent {
	private final Workspace workspace;
	private final User removedUser;
	private final User admin;
	private final Instant timeAt;

	public WorkspaceMemberRemovedEvent(Object source, Workspace workspace, User removedUser, User admin) {
		super(source);
		this.workspace = workspace;
		this.removedUser = removedUser;
		this.admin = admin;
		this.timeAt = Instant.now();
	}
}
