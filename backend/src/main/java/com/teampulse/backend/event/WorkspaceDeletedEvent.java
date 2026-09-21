package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


@Getter
public class WorkspaceDeletedEvent extends ApplicationEvent {
	private final UUID workspaceId;
	private final String workspaceName;
	private final User admin;
	private final List<UUID> memberIds;
	private final Instant timeAt;

	public WorkspaceDeletedEvent(Object source, UUID workspaceId, String workspaceName, User admin, List<UUID> memberIds) {
		super(source);
		this.workspaceId = workspaceId;
		this.workspaceName = workspaceName;
		this.admin = admin;
		this.memberIds = memberIds;
		this.timeAt = Instant.now();
	}
}
