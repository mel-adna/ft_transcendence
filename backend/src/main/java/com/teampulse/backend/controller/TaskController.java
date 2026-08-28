package com.teampulse.backend.controller;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teampulse.backend.dto.request.TaskCreateRequest;
import com.teampulse.backend.dto.request.TaskStatusUpdateRequest;
import com.teampulse.backend.dto.request.TaskUpdateRequest;
import com.teampulse.backend.dto.response.TaskResponse;
import com.teampulse.backend.service.TaskService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
@Tag(name = "Task Management", description = "Endpoints for handling Kanban board cards, task assignments, and lifecycle states.")
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "Create a new task inside a workspace", description = "Creates a task initialized in TODO state. Validates creator and assignee memberships.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Task created successfully", content = @Content(schema = @Schema(implementation = TaskResponse.class))),
        @ApiResponse(responseCode = "400", description = "Bad Request - Assignee not in workspace", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - Creator is not a member of the target workspace", content = @Content)
    })
    @PostMapping("/workspace/{workspaceId}")
    public ResponseEntity<TaskResponse> createTask(@PathVariable UUID workspaceId, @Parameter(hidden = true) Principal principal,
            										@Valid @RequestBody TaskCreateRequest request) {
        TaskResponse response = taskService.createTask(workspaceId, principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }



    @Operation(summary = "Get all tasks within a workspace", description = "Fetches the full collection of tasks for the Kanban board view.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tasks retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Forbidden - User is not a member of this workspace", content = @Content)
    })
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<TaskResponse>> getWorkspaceTasks(@PathVariable UUID workspaceId, @Parameter(hidden = true) Principal principal) {
        List<TaskResponse> tasks = taskService.getWorkspaceTasks(workspaceId, principal.getName());
        return ResponseEntity.ok(tasks);
    }


	
    @Operation(summary = "Get single task details by ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task details retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Task not found", content = @Content)
    })
    @GetMapping("/{taskId}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable UUID taskId, @Parameter(hidden = true) Principal principal) {
        TaskResponse task = taskService.getTaskById(taskId, principal.getName());
        return ResponseEntity.ok(task);
    }



    @Operation(summary = "Update full task metadata", description = "Updates text description, priority, and assigns/unassigns workers.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Task updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid payload or non-member assignee", content = @Content)
    })
    @PutMapping("/{taskId}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable UUID taskId, @Parameter(hidden = true) Principal principal,
    												@Valid @RequestBody TaskUpdateRequest request) {
        TaskResponse updatedTask = taskService.updateTask(taskId, principal.getName(), request);
        return ResponseEntity.ok(updatedTask);
    }



    @Operation(summary = "Quick update task status (Drag & Drop optimized)", description = "Updates only the card columns status. Invokes background completion events if moved to DONE.")
    @PatchMapping("/{taskId}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable UUID taskId, @Parameter(hidden = true) Principal principal,
            												@Valid @RequestBody TaskStatusUpdateRequest request) {

        TaskResponse updatedTask = taskService.updateTaskStatus(taskId, principal.getName(), request);
        return ResponseEntity.ok(updatedTask);
    }



    @Operation(summary = "Delete a task completely from board")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Task deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Forbidden - Missing workspace permissions", content = @Content)
    })
    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID taskId, @Parameter(hidden = true) Principal principal) {
        taskService.deleteTask(taskId, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
