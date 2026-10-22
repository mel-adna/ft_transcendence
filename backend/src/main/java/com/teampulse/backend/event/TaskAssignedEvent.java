package com.teampulse.backend.event;

import org.springframework.context.ApplicationEvent;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.User;
import lombok.Getter;

@Getter
public class TaskAssignedEvent extends ApplicationEvent {
    private final EventSnapshots.TaskValue task;
    private final EventSnapshots.UserValue assignee;
    private final EventSnapshots.UserValue assigner;
    private final boolean isReassignment;

    public TaskAssignedEvent(Object source, Task task, User assignee, User assigner, boolean isReassignment) {
        super(source);
        this.task = EventSnapshots.TaskValue.of(task);
        this.assignee = EventSnapshots.UserValue.of(assignee);
        this.assigner = EventSnapshots.UserValue.of(assigner);
        this.isReassignment = isReassignment;
    }
}
