package com.teampulse.backend.dto.request;

import com.teampulse.backend.model.enums.TaskStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TaskStatusUpdateRequest {
	@NotNull(message = "Task status is required (TODO, DOING, DONE)")
    private TaskStatus status;
}
