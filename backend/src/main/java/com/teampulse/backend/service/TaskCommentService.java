package com.teampulse.backend.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.teampulse.backend.mapper.TaskCommentMapper;
import com.teampulse.backend.repository.TaskCommentRepository;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;

import org.springframework.transaction.annotation.Transactional;

import com.teampulse.backend.dto.request.TaskCommentCreateRequest;
import com.teampulse.backend.dto.request.TaskCommentUpdateRequest;
import com.teampulse.backend.dto.response.TaskCommentResponse;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.TaskComment;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.model.enums.WorkspaceMemberRole;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TaskCommentService {
	private final TaskCommentRepository taskCommentRepository;
	private final TaskRepository taskRepository;
	private final UserRepository userRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final TaskCommentMapper taskCommentMapper;
	private final ActivityLogService activityLogService;


	@Transactional
	public TaskCommentResponse createComment(UUID taskId, String email, TaskCommentCreateRequest request) {
		if (taskId == null)
			throw new BadRequestException("Task ID cannot be null");

		Task task = taskRepository.findById(taskId).orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

		UUID workspaceId = task.getWorkspace().getId();
		validateWorkspaceMembership(workspaceId, email);

		User author = userRepository.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));

		TaskComment comment = new TaskComment();
		comment.setContent(request.getContent());
		comment.setTask(task);
		comment.setAuthor(author);

		TaskComment savedComment = taskCommentRepository.save(comment);

		String logDescription = String.format("User %s %s added a comment to task: '%s'", author.getFirstName(),
																							author.getLastName(),
																							task.getTitle());

		activityLogService.logActivity(workspaceId, author.getId(), savedComment.getId(), "TASK_COMMENT_CREATED", logDescription);
	
		return taskCommentMapper.toResponse(savedComment);
	}


	@Transactional(readOnly = true)
	public Page<TaskCommentResponse> getCommentByTaskId(UUID taskId, String email, Pageable pageable) {
		if (taskId == null)
			throw new BadRequestException("Task ID cannot be null");

		Task task = taskRepository.findById(taskId).orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

		validateWorkspaceMembership(task.getWorkspace().getId(), email);

		Page<TaskComment> comments = taskCommentRepository.findByTaskIdOrderByCreatedAtDesc(taskId, pageable);

		return comments.map(taskCommentMapper::toResponse);
	}

	@Transactional
	public TaskCommentResponse updateComment(UUID commentId, String email, TaskCommentUpdateRequest request) {
		if (commentId == null)
			throw new BadRequestException("Comment ID cannot be null");

		TaskComment comment = taskCommentRepository.findById(commentId).orElseThrow(() -> new ResourceNotFoundException("Comment not found with ID: " + commentId));

		if (!comment.getAuthor().getEmail().equals(email))
			throw new UnauthorizedAccessException("You are not authorized to update this comment!");

		comment.setContent(request.getContent());
		TaskComment updatedComment = taskCommentRepository.save(comment);

		UUID workspaceId = comment.getTask().getWorkspace().getId();
		String logDescription = String.format("User %s updated their comment on task: '%s'", comment.getAuthor().getFirstName(), comment.getTask().getTitle());

		activityLogService.logActivity(workspaceId, comment.getAuthor().getId(), updatedComment.getId(), "TASK_COMMENT_UPDATED", logDescription);

		return taskCommentMapper.toResponse(updatedComment);
	}


	@Transactional
	public void deleteComment(UUID commentId, String email) {
		if (commentId == null)
			throw new BadRequestException("Comment ID cannot be null");

		TaskComment comment = taskCommentRepository.findById(commentId).orElseThrow(() -> new ResourceNotFoundException("Comment not found with ID: " + commentId));

		UUID workspaceId = comment.getTask().getWorkspace().getId();
		User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));

		boolean isAuthor = comment.getAuthor().getEmail().equals(email);
	
		if (!isAuthor) {
			WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserEmail(workspaceId, email)
											.orElseThrow(() -> new UnauthorizedAccessException("Access denied. You are not part of this workspace."));
			
			if (member.getRole() != WorkspaceMemberRole.ADMIN)
				throw new UnauthorizedAccessException("You can only delete your own comments unless you are a Workspace ADMIN.");
		}

		taskCommentRepository.delete(comment);

		String logDescription = String.format("User %s deleted a comment from task: '%s'", 
                currentUser.getFirstName(), comment.getTask().getTitle());

		activityLogService.logActivity(workspaceId, currentUser.getId(), commentId, "TASK_COMMENT_DELETED", logDescription);
	}



	private void validateWorkspaceMembership(UUID workspaceId, String email) {
		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, email);
		if (!isMember)
			throw new UnauthorizedAccessException("Access denied. You are not a member of this workspace.");
	}
}
