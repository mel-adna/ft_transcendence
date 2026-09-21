package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.WorkspaceMemberAddedEvent;
import com.teampulse.backend.service.ActivityLogService;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;
import com.teampulse.backend.service.RedisEventPublisherService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WorkspaceEventListener {
	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;


	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceMemberAddedEvent(WorkspaceMemberAddedEvent event) {
		boolean isAdminNull = event.getAdmin() == null;
		String adminName = isAdminNull ? "Workspace Admin" : event.getAdmin().getFirstName();
		UUID adminId = isAdminNull ? null : event.getAdmin().getId();

		String msg = String.format("You have been added to workspace '%s' by %s.",
				event.getWorkspace().getName(), adminName);

		notificationService.createNotification(
				event.getAddedUser(),
				NotificationType.WORKSPACE_MEMBER_ADDED,
				EntityType.WORKSPACE,
				event.getWorkspace().getId(),
				msg);

		if (adminId != null) {
			activityLogService.logActivity(
					event.getWorkspace().getId(),
					adminId,
					event.getAddedUser().getId(),
					"WORKSPACE_MEMBER_ADDED",
					String.format("Added %s %s to workspace", event.getAddedUser().getFirstName(), event.getAddedUser().getLastName()));

		}

		emailService.sendEmail(event.getAddedUser().getEmail(),
				"Welcome to Workspace: " + event.getWorkspace().getName(), msg);

		UnifiedEvent realTimeEvent = UnifiedEvent.builder()
				.eventId(UUID.randomUUID())
				.type("WORKSPACE")
				.action("MEMBER_ADDED")
				.recipientId(event.getAddedUser().getId())
				.senderId(adminId)
				.entityType(EntityType.WORKSPACE.name())
				.entityId(event.getWorkspace().getId().toString())
				.payload(Map.of(
						"workspaceName", event.getWorkspace().getName(),
						"adminName", adminName,
						"message", msg
				))
				.timestamp(Instant.now())
				.build();

		redisEventPublisherService.publish(realTimeEvent);
	}
}
