package com.teampulse.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teampulse.backend.dto.request.TaskCreateRequest;
import com.teampulse.backend.dto.request.TaskStatusUpdateRequest;
import com.teampulse.backend.dto.request.TaskUpdateRequest;
import com.teampulse.backend.dto.response.TaskResponse;
import com.teampulse.backend.enums.TaskStatus;
import com.teampulse.backend.event.TaskAssignedEvent;
import com.teampulse.backend.event.TaskCompletedEvent;
import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.TaskMapper;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.Workspace;
import com.teampulse.backend.model.WorkspaceMemberId;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

	private final TaskRepository taskRepository;
	private final WorkspaceRepository workspaceRepository;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final UserRepository userRepository;
	private final TaskMapper taskMapper;
	private final ActivityLogService activityLogService;
	private final ApplicationEventPublisher eventPublisher;


	@Transactional
	public TaskResponse createTask(UUID workspaceId, String creatorEmail, TaskCreateRequest request) {
		if (workspaceId == null)
			throw new BadRequestException("Workspace ID cannot be null");

		log.info("Attempting to create task '{}' in workspace ID: {} by user: {}", request.getTitle(), workspaceId, creatorEmail);

		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new ResourceNotFoundException("Workspace not found with ID: " + workspaceId));

		validateWorkspaceMembership(workspaceId, creatorEmail, "You must be a member of this workspace to create tasks!");

		User creator = userRepository.findByEmail(creatorEmail)
				.orElseThrow(() -> new ResourceNotFoundException("Creator user profile not found"));

		Task task = new Task();
		task.setWorkspace(workspace);
		task.setCreator(creator);
		task.setTitle(request.getTitle());
		task.setDescription(request.getDescription());
		task.setPriority(request.getPriority());
		task.setStatus(TaskStatus.TODO);

		if (request.getAssigneeId() != null) {
			User assignee = validateAndGetAssignee(workspaceId, request.getAssigneeId());
			task.setAssignee(assignee);
		}

		Task savedTask = taskRepository.save(task);

		String logDescription = String.format("%s %s created task '%s'", creator.getFirstName(), creator.getLastName(), savedTask.getTitle());
		activityLogService.logActivity(workspaceId, creator.getId(), savedTask.getId(), "TASK_CREATED", logDescription);

		if (savedTask.getAssignee() != null)
			eventPublisher.publishEvent(new TaskAssignedEvent(this, savedTask, savedTask.getAssignee(), creator, false));

		log.info("Task successfully created with ID: {} in workspace: {}", savedTask.getId(), workspaceId);
		return taskMapper.toResponse(savedTask);
	}


	@Transactional(readOnly = true)
	public List<TaskResponse> getWorkspaceTasks(UUID workspaceId, String email) {
		validateWorkspaceMembership(workspaceId, email, "You don't have access to this workspace's tasks!");

		return taskRepository.findByWorkspaceId(workspaceId).stream()
				.map(taskMapper::toResponse)
				.toList();
	}


	@Transactional(readOnly = true)
	public TaskResponse getTaskById(UUID taskId, String email) {

		if (taskId == null)
			throw new BadRequestException("Task ID cannot be null");

		Task task = taskRepository.findById(taskId)
				.orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

		validateWorkspaceMembership(task.getWorkspace().getId(), email, "You don't have access to view this task!");

		return taskMapper.toResponse(task);
	}


	@Transactional
	public TaskResponse updateTask(UUID taskId, String email, TaskUpdateRequest request) {

		if (taskId == null)
			throw new BadRequestException("Task ID cannot be null");

		Task task = taskRepository.findById(taskId)
				.orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

		UUID workspaceId = task.getWorkspace().getId();
		validateWorkspaceMembership(workspaceId, email, "You don't have permission to update tasks in this workspace!");

		User currentUser = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		final TaskStatus oldStatus = task.getStatus();
		final User oldAssignee = task.getAssignee();

		task.setTitle(request.getTitle());
		task.setDescription(request.getDescription());
		task.setPriority(request.getPriority());
		task.setStatus(request.getStatus());

		if (request.getAssigneeId() != null) {
			User assignee = validateAndGetAssignee(workspaceId, request.getAssigneeId());
			task.setAssignee(assignee);
		} else {
			task.setAssignee(null);
		}

		Task updatedTask = taskRepository.save(task);

		checkAndTriggerStatusEvents(updatedTask, oldStatus, currentUser);

		if (updatedTask.getAssignee() != null
				&& (oldAssignee == null || !oldAssignee.getId().equals(updatedTask.getAssignee().getId()))) {
			User updater = userRepository.findByEmail(email).orElse(null);
			eventPublisher.publishEvent(new TaskAssignedEvent(
                    this,
					updatedTask,
					updatedTask.getAssignee(),
					updater,
					true));
		}

		return taskMapper.toResponse(updatedTask);
	}


	@Transactional
	public TaskResponse updateTaskStatus(UUID taskId, String email, TaskStatusUpdateRequest request) {

		if (taskId == null)
			throw new BadRequestException("Task ID cannot be null");

		Task task = taskRepository.findById(taskId)
				.orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

		validateWorkspaceMembership(task.getWorkspace().getId(), email, "You don't have permission to update task status!");

		User currentUser = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		TaskStatus oldStatus = task.getStatus();
		task.setStatus(request.getStatus());

		Task updatedTask = taskRepository.save(task);

		checkAndTriggerStatusEvents(updatedTask, oldStatus, currentUser);

		return taskMapper.toResponse(updatedTask);
	}

	@Transactional
	public void deleteTask(UUID taskId, String email) {

		if (taskId == null)
			throw new BadRequestException("Task ID cannot be null");

		Task task = taskRepository.findById(taskId)
				.orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

		validateWorkspaceMembership(task.getWorkspace().getId(), email, "You don't have permission to delete tasks from this workspace!");

		User currentUser = userRepository.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));

		taskRepository.delete(task);

		String logDescription = String.format("%s %s deleted task '%s'", currentUser.getFirstName(), currentUser.getLastName(), task.getTitle());
		activityLogService.logActivity(task.getWorkspace().getId(), currentUser.getId(), taskId, "TASK_DELETED", logDescription);

		log.info("Task ID: {} was successfully deleted by user: {}", taskId, email);
	}


	private void validateWorkspaceMembership(UUID workspaceId, String email, String exceptionMessage) {
		boolean isMember = workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(workspaceId, email);
		if (!isMember) {
			throw new UnauthorizedAccessException(exceptionMessage);
		}
	}

	private User validateAndGetAssignee(UUID workspaceId, UUID assigneeId) {

		if (assigneeId == null) {
			throw new BadRequestException("Assignee ID cannot be null");
		}

		User assignee = userRepository.findById(assigneeId)
				.orElseThrow(() -> new ResourceNotFoundException("Assignee user not found with ID: " + assigneeId));

		boolean isAssigneeMember = workspaceMemberRepository.existsById(new WorkspaceMemberId(workspaceId, assigneeId));

		if (!isAssigneeMember) {
			throw new BadRequestException("The assigned user is not a member of this workspace!");
		}
		return assignee;
	}

	private void checkAndTriggerStatusEvents(Task task, TaskStatus oldStatus, User actor) {
		if (task.getStatus() == TaskStatus.DONE && oldStatus != TaskStatus.DONE)
			triggerTaskCompletedEvent(task, actor);
	}

	private void triggerTaskCompletedEvent(Task completedTask, User actor) {
		log.info("Event Trigger Block: Task ID {} has been moved to COMPLETED by user Id {}.", completedTask.getId(), actor.getId());
		eventPublisher.publishEvent(new TaskCompletedEvent(this, completedTask, actor));
	}
}