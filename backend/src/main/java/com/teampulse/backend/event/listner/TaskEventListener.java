package com.teampulse.backend.event.listner;

import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.TaskAssignedEvent;
import com.teampulse.backend.event.TaskCompletedEvent;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.service.ActivityLogService;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Objects;


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

		User actor = event.getCompletedBy() != null ? event.getCompletedBy() : task.getCreator();
		try {
			String logDescription = String.format("%s %s completed task '%s'",
					actor.getFirstName(), actor.getLastName(), task.getTitle());

			activityLogService.logActivity(
					task.getWorkspace().getId(),
					actor.getId(),
					task.getId(),
					"TASK_COMPLETED",
					logDescription);
		} catch (Exception e) {
			log.error("Failed to create ActivityLog for completed task ID: {}. Error: {}", task.getId(), e.getMessage());
		}

		try {
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
		if (task == null || task.getAssignee() == null || event.getAssignee() == null)
			return;

		User assigner = event.getAssigner();
		User assignee = event.getAssignee();

		NotificationType notifType = event.isReassignment() ? NotificationType.TASK_UPDATED : NotificationType.TASK_ASSIGNED;
		String actionText = event.isReassignment() ? "reassigned task" : "assigned task";

		String logDescription = String.format("%s %s %s '%s' to %s %s",
				assigner.getFirstName(), assigner.getLastName(),
				actionText, task.getTitle(),
				assignee.getFirstName(), assignee.getLastName());

		activityLogService.logActivity(
				task.getWorkspace().getId(),
				assigner.getId(),
				task.getId(),
				notifType.name(),
				logDescription);

		boolean isSelfAssignment = Objects.equals(assignee.getId(), assigner.getId());
		if (!isSelfAssignment) {
			String alertMsg = String.format("%s %s %s '%s' to you.",
					assigner.getFirstName(), assigner.getLastName(),
					actionText, task.getTitle());

			notificationService.createNotification(
					assignee,
					notifType,
					EntityType.TASK,
					task.getId(),
					alertMsg);

			emailService.sendEmail(
					assignee.getEmail(),
					"New Task Assignment: " + task.getTitle(),
					alertMsg);
		} else {
			log.info("Skipping self-assignment notification/email for user: {}", assignee.getEmail());
		}
	}
}
