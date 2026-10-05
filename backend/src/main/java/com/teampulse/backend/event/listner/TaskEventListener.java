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

		String actorName = getSafeFullName(actor);

		try {
			String logDescription = String.format("%s completed task '%s'", actorName, task.getTitle());

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

			UUID creatorId = creator != null ? creator.getId() : null;
			UUID assigneeId = assignee != null ? assignee.getId() : null;
			UUID actorId = actor.getId();

			if (assignee != null && !Objects.equals(assigneeId, creatorId) && !Objects.equals(assigneeId, actorId)) {
				String msgToAssignee = String.format("The task '%s' assigned to you has been marked as COMPLETED by %s.",
						task.getTitle(), actorName);

				notifyUserAndPublish(assignee, actor, task, msgToAssignee, NotificationType.TASK_COMPLETED, "COMPLETED");
			}

			if (creator != null && !Objects.equals(creatorId, actorId)) {
				if (assignee == null || !Objects.equals(creatorId, assigneeId)) {
					String msgToCreator = String.format("The task '%s' you created has been marked as COMPLETED by %s.",
							task.getTitle(), actorName);

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
		String assignerName = isAssignerDeleted ? "A deleted user" : getSafeFullName(assigner);

		boolean isSelfAssignment = !isAssignerDeleted && Objects.equals(assignee.getId(), assigner.getId());
		String targetName = isSelfAssignment ? "himself" : getSafeFullName(assignee);

		String logType = event.isReassignment() ? "TASK_REASSIGNED" : "TASK_ASSIGNED";
		String actionText = event.isReassignment() ? "reassigned task" : "assigned task";
		String logDescription = String.format("%s %s '%s' to %s", assignerName, actionText, task.getTitle(), targetName);

		if (assignerId != null) {
			try {
				activityLogService.logActivity(task.getWorkspace().getId(), assignerId,
						task.getId(), logType, logDescription);
			} catch (Exception e) {
				log.error("Failed to log activity for assigned task ID: {}. Error: {}", task.getId(), e.getMessage());
			}
		}

		if (!isSelfAssignment) {
			try {
				String alertMsg = String.format("%s %s '%s' to you.", assignerName, actionText, task.getTitle());
				NotificationType notifType = event.isReassignment() ? NotificationType.TASK_UPDATED : NotificationType.TASK_ASSIGNED;
				String redisAction = event.isReassignment() ? "REASSIGNED" : "ASSIGNED";

				notifyUserAndPublish(assignee, assigner, task, alertMsg, notifType, redisAction);
			} catch (Exception e) {
				log.error("Failed to send notification for assigned task ID: {}. Error: {}", task.getId(), e.getMessage());
			}
		}
	}

	private void notifyUserAndPublish(User recipient, User actor, Task task, String message,
	                                  NotificationType notifyType, String redisAction) {

		if (recipient == null || recipient.getEmail() == null) {
			log.warn("Cannot send notification/email. Recipient or email is null for task ID: {}", task.getId());
			return;
		}

		notificationService.createNotification(recipient, notifyType, EntityType.TASK, task.getId(), message);

		if (!recipient.getEmail().endsWith("@teampulse.local")) {
			emailService.sendEmail(recipient.getEmail(), "Task Update: " + task.getTitle(), message);
		}

		UUID senderId = actor != null ? actor.getId() : null;
		String actorName = actor != null ? getSafeFullName(actor) : "System";

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

	private String getSafeFullName(User user) {
		if (user == null) return "Unknown User";
		String firstName = user.getFirstName() != null ? user.getFirstName() : "";
		String lastName = user.getLastName() != null ? user.getLastName() : "";
		String fullName = (firstName + " " + lastName).trim();
		return fullName.isEmpty() ? user.getEmail() : fullName;
	}
}
