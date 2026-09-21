package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
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
import com.teampulse.backend.service.RedisEventPublisherService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;


@Slf4j
@Component
@RequiredArgsConstructor
public class TaskEventListener {

	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final TaskRepository taskRepository;
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;


	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleTaskCompletedEvent(TaskCompletedEvent event) {

		Task task = taskRepository.findById(event.getTask().getId()).orElse(null);

		if (task == null) {
			log.warn("Task not found for event logging: {}", event.getTask().getId());
			return;
		}

		User actor = event.getCompletedBy() != null ? event.getCompletedBy() : task.getCreator();
		if (actor == null) {
			log.warn("Actor (creator/completedBy) is null or deleted for completed task ID: {}. Skipping logging/notification.", task.getId());
			return;
		}

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
			User assignee = task.getAssignee();
			User creator = task.getCreator();

			if (assignee != null && !Objects.equals(assignee.getId(), creator.getId())) {
				String msgToAssignee = String.format("The task '%s' assigned to you has been marked as COMPLETED by %s %s.",
						task.getTitle(), actor.getFirstName(), actor.getLastName());

				notifyUserAndPublish(assignee, actor, task, msgToAssignee, NotificationType.TASK_COMPLETED, "COMPLETED");
			}

			if (creator != null && !Objects.equals(creator.getId(), actor.getId())) {

				if (assignee == null || !Objects.equals(creator.getId(), assignee.getId())) {
					String msgToCreator = String.format("The task '%s' you created has been marked as COMPLETED by %s %s.",
							task.getTitle(), actor.getFirstName(), actor.getLastName());

					notifyUserAndPublish(creator, actor, task, msgToCreator, NotificationType.TASK_COMPLETED, "COMPLETED");
				}
			}
		} catch (Exception e) {
			log.error("Failed to send notifications for completed task ID: {}. Error: {}", task.getId(), e.getMessage());
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

		boolean isAssignerDeleted = (assigner == null);
		UUID assignerId = isAssignerDeleted ? null : assigner.getId();
		String assignerFirstName = isAssignerDeleted ? "A deleted" : assigner.getFirstName();
		String assignerLastName = isAssignerDeleted ? "user" : assigner.getLastName();

		boolean isSelfAssignment = !isAssignerDeleted && Objects.equals(assignee.getId(), assigner.getId());
		String targetName = isSelfAssignment ? "himself" : String.format("%s %s", assignee.getFirstName(), assignee.getLastName());

		String logType = event.isReassignment() ? "TASK_REASSIGNED" : "TASK_ASSIGNED";
		String actionText = event.isReassignment() ? "reassigned task" : "assigned task";
		String logDescription = String.format("%s %s %s '%s' to %s", assignerFirstName, assignerLastName,
				actionText, task.getTitle(), targetName);

		if (assignerId != null) {
			activityLogService.logActivity(task.getWorkspace().getId(), assignerId,
					task.getId(), logType, logDescription);
		}

		if (!isSelfAssignment) {
			String alertMsg = String.format("%s %s %s '%s' to you.", assignerFirstName, assignerLastName, actionText, task.getTitle());
			NotificationType notifType = event.isReassignment() ? NotificationType.TASK_UPDATED : NotificationType.TASK_ASSIGNED;
			String redisAction = event.isReassignment() ? "REASSIGNED" : "ASSIGNED";

			notifyUserAndPublish(assignee, assigner, task, alertMsg, notifType, redisAction);
		}
	}

	private void notifyUserAndPublish(User recipient, User actor, Task task, String message,
	                                  NotificationType notifyType, String redisAction) {

		notificationService.createNotification(recipient, notifyType, EntityType.TASK, task.getId(), message);

		emailService.sendEmail(recipient.getEmail(), "Task Update: " + task.getTitle(), message);

		UUID senderId = actor != null ? actor.getId() : null;

		String actorName = actor != null ? actor.getFirstName() + " " + actor.getLastName() : "System";

		UnifiedEvent realTimeEvent = UnifiedEvent.builder()
				.eventId(UUID.randomUUID())
				.type("TASK")
				.action(redisAction)
				.recipientId(recipient.getId())
				.senderId(senderId)
				.entityType(EntityType.TASK.name())
				.entityId(task.getId().toString())
				.payload(Map.of(
						"taskTitle", task.getTitle(),
						"workspaceId", task.getWorkspace().getId().toString(),
						"actorName", actorName,
						"message", message
				))
				.timestamp(Instant.now())
				.build();

		redisEventPublisherService.publish(realTimeEvent);
	}
}
