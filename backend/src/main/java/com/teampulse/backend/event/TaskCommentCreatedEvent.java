package com.teampulse.backend.event;

import org.springframework.context.ApplicationEvent;
import com.teampulse.backend.model.TaskComment;
import lombok.Getter;

@Getter
public class TaskCommentCreatedEvent extends ApplicationEvent {
    private final TaskComment comment;

    public TaskCommentCreatedEvent(Object source, TaskComment comment) {
        super(source);
        this.comment = comment;
    }
}
