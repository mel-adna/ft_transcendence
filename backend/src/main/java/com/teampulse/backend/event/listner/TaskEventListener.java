package com.teampulse.backend.event.listner;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.google.common.base.Objects;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.TaskAssignedEvent;
import com.teampulse.backend.event.TaskCompletedEvent;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.service.ActivityLogService;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class TaskEventListener {

	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final TaskRepository taskRepository;
	private final EmailService emailService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleTaskCompletedEvent(TaskCompletedEvent event) {

		Task task = taskRepository.findById(event.getTask().getId()).orElse(null);

		if (task == null) {
			log.warn("Task not found for event logging: {}", event.getTask().getId());
			return;
		}
		log.info("Successfully intercepted TaskCompletedEvent for Task ID: {} which occurred at: {}",
				task.getId(), event.getTimeAt());

		try {
			// processActivityLogging(task, event);
			activityLogService.logActivity(task.getWorkspace().getId(),
					task.getCreator().getId(),
					task.getId(),
					"TASK_COMPLETED",
					"Completed the task: " + task.getTitle());
		} catch (Exception e) {
			log.error("Failed to create ActivityLog for completed task ID: {}. Error: {}", task.getId(),
					e.getMessage());
		}

		try {
			// sendTaskCompletedNotifications(task);
			if (task.getAssignee() != null) {
				String alertMsg = String.format("The task '%s' assigned to you has been marked as COMPLETED.",
						task.getTitle());

				notificationService.createNotification(
						task.getAssignee(),
						NotificationType.TASK_COMPLETED,
						EntityType.TASK,
						task.getId(),
						alertMsg);

				emailService.sendEmail(task.getAssignee().getEmail(), "Task Completed: " + task.getTitle(),
						alertMsg);
				log.info("Notification & Email successfully persisted for Assignee: {}", task.getAssignee().getEmail());
			}
		} catch (Exception e) {
			log.error("Failed to send notifications for completed task ID: {}. Error: {}", task.getId(),
					e.getMessage());
		}
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleTaskAssignedEvent(TaskAssignedEvent event) {
		Task task = taskRepository.findById(event.getTask().getId()).orElse(null);
		if (task == null || task.getAssignee() == null)
			return;

		if (event.getAssigner() == null || Objects.equal(event.getAssignee().getId(), event.getAssigner().getId())) {
			log.info("Skipping self-assignment notification for user: {}", event.getAssignee().getEmail());
			return;
		}

		NotificationType notifType = event.isReassignment() ? NotificationType.TASK_UPDATED
				: NotificationType.TASK_ASSIGNED;
		String actioText = event.isReassignment() ? "reassigned task" : "assigned task";

		String alertMsg = String.format("%s %s %s '%s' to you.",
				event.getAssigner().getFirstName(), event.getAssigner().getLastName(),
				actioText, task.getTitle());

		notificationService.createNotification(
				event.getAssignee(),
				notifType,
				EntityType.TASK,
				task.getId(),
				alertMsg);

		activityLogService.logActivity(
				task.getWorkspace().getId(),
				event.getAssigner().getId(),
				task.getId(),
				notifType.name(),
				alertMsg);

		emailService.sendEmail(
				event.getAssignee().getEmail(),
				"New Task Assignment: " + task.getTitle(),
				alertMsg);
	}
}
