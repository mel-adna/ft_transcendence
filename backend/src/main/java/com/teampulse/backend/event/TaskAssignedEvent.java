package com.teampulse.backend.event;

import org.springframework.context.ApplicationEvent;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.User;
import lombok.Getter;

@Getter
public class TaskAssignedEvent extends ApplicationEvent {
    private final Task task;
    private final User assignee;
    private final User assigner;
    private final boolean isReassignment;

    public TaskAssignedEvent(Object source, Task task, User assignee, User assigner, boolean isReassignment) {
        super(source);
        this.task = task;
        this.assignee = assignee;
        this.assigner = assigner;
        this.isReassignment = isReassignment;
    }
}
