package com.teampulse.backend.dto.request;

import java.util.UUID;

import com.teampulse.backend.model.enums.TaskPriority;
import com.teampulse.backend.model.enums.TaskStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TaskUpdateRequest {
    @NotBlank(message="Task title is required")
    @Size(max=150, message="Task title must not exceed 150 characters")
    private String title;

    @Size(max=40000, message="Description must not exceed 40000 characters")
    private String description;

    @NotNull(message="Task status is required (TODO, DOING, DONE)")
    private TaskStatus status;

    @NotNull(message="Task priority is required (LOW, MEDIUM, HIGH)")
    private TaskPriority priority;

    private UUID assigneeId;
}