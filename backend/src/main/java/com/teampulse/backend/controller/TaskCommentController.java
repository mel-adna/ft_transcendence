package com.teampulse.backend.controller;

import java.security.Principal;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import com.teampulse.backend.dto.request.TaskCommentCreateRequest;
import com.teampulse.backend.dto.request.TaskCommentUpdateRequest;
import com.teampulse.backend.dto.response.TaskCommentResponse;
import com.teampulse.backend.service.TaskCommentService;

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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Task Comments", description = "Endpoints for managing task comments within a workspace. Requires workspace membership.")
public class TaskCommentController {

	private final TaskCommentService taskCommentService;


	@Operation(
		summary = "Create a new comment on a specific task",
		description = "Allows a workspace member to add a comment to a task. Triggers an activity log."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Comment successfully created",
            															content = @Content(schema = @Schema(implementation = TaskCommentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid Task ID or bad request payload", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized - User session invalid", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - User is not a member of the workspace", content = @Content),
        @ApiResponse(responseCode = "404", description = "Task not found", content = @Content)
    })
	@PostMapping("/tasks/{taskId}/comments")
	public ResponseEntity<TaskCommentResponse> createComment(@Parameter(description="UUID of the task to add a comment to", required=true)
															@PathVariable UUID taskId, @Valid @RequestBody TaskCommentCreateRequest request,
															@Parameter(hidden=true) Principal principal) {

		TaskCommentResponse response = taskCommentService.createComment(taskId, principal.getName(), request);

		return new ResponseEntity<>(response, HttpStatus.CREATED);
	}


	@Operation(
        summary = "Get paginated comments for a specific task",
        description = "Retrieves a paginated list of comments for the given task, sorted by creation date descending."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved comments"),
        @ApiResponse(responseCode = "403", description = "Forbidden - User is not a member of the workspace", content = @Content),
        @ApiResponse(responseCode = "404", description = "Task not found", content = @Content)
    })
	@GetMapping("/tasks/{taskId}/comments")
	public ResponseEntity<Page<TaskCommentResponse>> getComments(@Parameter(description = "UUID of the task to fetch comments for", required = true)
																			@PathVariable UUID taskId, @PageableDefault(size = 10, sort = "createdAt")
																			Pageable pageable, @Parameter(hidden = true)
																			Principal principal) {

		Page<TaskCommentResponse> comments = taskCommentService.getCommentByTaskId(taskId, principal.getName(), pageable);

		return ResponseEntity.ok(comments);
	}


	@Operation(
        summary = "Update an existing comment",
        description = "Allows the author to update the content of their own comment."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Comment successfully updated",
            content = @Content(schema = @Schema(implementation = TaskCommentResponse.class))),
        @ApiResponse(responseCode = "400", description = "Invalid data supplied", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - User is not the author of this comment", content = @Content),
        @ApiResponse(responseCode = "404", description = "Comment not found", content = @Content)
    })
	@PutMapping("/comments/{commentId}")
	public ResponseEntity<TaskCommentResponse> updateComment(@Parameter(description = "UUID of the comment to update", required = true)
            												@PathVariable UUID commentId,
            												@Valid @RequestBody TaskCommentUpdateRequest request,
            												@Parameter(hidden = true) Principal principal) {
		TaskCommentResponse response = taskCommentService.updateComment(commentId, principal.getName(), request);
		return ResponseEntity.ok(response);
	}


	@Operation(
        summary = "Delete a comment",
        description = "Deletes a comment. Only the author or a Workspace ADMIN can perform this action."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Comment successfully deleted", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - User lacks permission to delete this comment", content = @Content),
        @ApiResponse(responseCode = "404", description = "Comment not found", content = @Content)
    })
	@DeleteMapping("/comments/{commentId}")
	public ResponseEntity<Void> deleteComment(@Parameter(description = "UUID of the comment to delete", required = true)
            								@PathVariable UUID commentId, @Parameter(hidden = true) Principal principal) {

		taskCommentService.deleteComment(commentId, principal.getName());

		return ResponseEntity.noContent().build();
	}
}
