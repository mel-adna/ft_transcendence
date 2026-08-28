package com.teampulse.backend.event;

import org.springframework.context.ApplicationEvent;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import lombok.Getter;

@Getter
public class WorkspaceMemberAddedEvent extends ApplicationEvent {
    private final Workspace workspace;
    private final User addedUser;
    private final User admin;

    public WorkspaceMemberAddedEvent(Object source, Workspace workspace, User addedUser, User admin) {
        super(source);
        this.workspace = workspace;
        this.addedUser = addedUser;
        this.admin = admin;
    }
}
