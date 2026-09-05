package com.teampulse.backend.event;

import java.time.Clock;
import java.time.Instant;

import com.teampulse.backend.model.User;
import org.springframework.context.ApplicationEvent;

import com.teampulse.backend.model.Task;

import lombok.Getter;

@Getter
public class TaskCompletedEvent extends ApplicationEvent{

	private final Task task;
	private final User completedBy;
	private final Instant timeAt;

	public TaskCompletedEvent(Object source, Task task, User completedBy) {
		super(source);

		if (task == null) {
            throw new IllegalArgumentException("Task payload inside TaskCompletedEvent cannot be null");
        }

		this.task = task;
		this.completedBy = completedBy;
        this.timeAt = Instant.now(Clock.systemUTC());
	}
}
