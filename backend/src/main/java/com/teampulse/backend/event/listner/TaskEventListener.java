package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.TaskAssignedEvent;
import com.teampulse.backend.event.TaskCompletedEvent;
import com.teampulse.backend.model.Notification;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;
import com.teampulse.backend.service.RedisEventPublisherService;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
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
	private final TaskRepository taskRepository;
	private final com.teampulse.backend.repository.UserRepository userRepository;
	private final com.teampulse.backend.repository.WorkspaceMemberRepository workspaceMemberRepository;
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void handleTaskCompletedEvent(TaskCompletedEvent event) {
		Task task = taskRepository.findById(event.getTask().id()).orElse(null);

		if (task == null) {
			log.warn("Task not found for event logging: {}", event.getTask().id());
			return;
		}

		if (!Objects.equals(task.getVersion(), event.getTask().version()) || task.getStatus() != event.getTask().status()) return;
		User actor = event.getCompletedBy() != null ? userRepository.findById(event.getCompletedBy().id()).orElse(null) : task.getCreator();
		if (actor == null) {
			return;
		}

		String actorName = getSafeFullName(actor);

		try {
			User assignee = task.getAssignee();
			User creator = task.getCreator();

			UUID creatorId = creator != null ? creator.getId() : null;
			UUID assigneeId = assignee != null ? assignee.getId() : null;
			UUID actorId = actor.getId();

			if (assignee != null && !Objects.equals(assigneeId, creatorId) && !Objects.equals(assigneeId, actorId)) {
				String msgToAssignee = String.format("The task '%s' assigned to you has been marked as COMPLETED by %s.", task.getTitle(), actorName);
				notifyUserAndPublish(assignee, actor, task, msgToAssignee, NotificationType.TASK_COMPLETED, "COMPLETED");
			}

			if (creator != null && !Objects.equals(creatorId, actorId)) {
				if (assignee == null || !Objects.equals(creatorId, assigneeId)) {
					String msgToCreator = String.format("The task '%s' you created has been marked as COMPLETED by %s.", task.getTitle(), actorName);
					notifyUserAndPublish(creator, actor, task, msgToCreator, NotificationType.TASK_COMPLETED, "COMPLETED");
				}
			}
		} catch (Exception e) {
			log.error("Failed to send notifications for completed task ID: {}. Error: {}", task.getId(), e.getClass().getSimpleName());
		}
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void handleTaskAssignedEvent(TaskAssignedEvent event) {
		Task task = taskRepository.findById(event.getTask().id()).orElse(null);
		if (task == null || task.getAssignee() == null || event.getAssignee() == null)
			return;

		if (!Objects.equals(task.getVersion(), event.getTask().version()) || !Objects.equals(task.getAssignee().getId(), event.getAssignee().id())) return;
		User assigner = event.getAssigner() == null ? null : userRepository.findById(event.getAssigner().id()).orElse(null);
		User assignee = task.getAssignee();

		boolean isAssignerDeleted = (assigner == null);
		String assignerName = isAssignerDeleted ? "A deleted user" : getSafeFullName(assigner);
		boolean isSelfAssignment = !isAssignerDeleted && Objects.equals(assignee.getId(), assigner.getId());

		String actionText = event.isReassignment() ? "reassigned task" : "assigned task";

		if (!isSelfAssignment) {
			try {
				String alertMsg = String.format("%s %s '%s' to you.", assignerName, actionText, task.getTitle());
				NotificationType notifType = event.isReassignment() ? NotificationType.TASK_UPDATED : NotificationType.TASK_ASSIGNED;
				String redisAction = event.isReassignment() ? "REASSIGNED" : "ASSIGNED";

				notifyUserAndPublish(assignee, assigner, task, alertMsg, notifType, redisAction);
			} catch (Exception e) {
				log.error("Failed to send notification for assigned task ID: {}. Error: {}", task.getId(), e.getClass().getSimpleName());
			}
		}
	}

	private void notifyUserAndPublish(User recipient, User actor, Task task, String message, NotificationType notifyType, String redisAction) {
		if (recipient == null || recipient.getEmail() == null) {
			return;
		}
		if (!workspaceMemberRepository.existsByWorkspaceIdAndUserEmail(task.getWorkspace().getId(), recipient.getEmail())) {
			return;
		}

		Notification notification = notificationService.createNotification(recipient, notifyType, EntityType.TASK, task.getId(), message);

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
						"notificationId", notification.getId().toString(),
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