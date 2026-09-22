package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.WorkspaceInvitationAcceptedEvent;
import com.teampulse.backend.event.WorkspaceInvitationSentEvent;
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
public class WorkspaceInvitationEventListener {

	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceInvitationSentEvent(WorkspaceInvitationSentEvent event) {
		String inviterName = event.getInviter().getFirstName();
		String workspaceName = event.getWorkspace().getName();
		String inviteeEmail = event.getInvitation().getInviteeEmail();

		String msg = String.format("You have been invited to join workspace '%s' by %s.", workspaceName, inviterName);

//		activityLogService.logActivity(
//				event.getWorkspace().getId(),
//				event.getInviter().getId(),
//				event.getInvitee() != null ? event.getInvitee().getId() : null,
//				"WORKSPACE_INVITATION_SENT",
//				String.format("Invited %s to workspace", inviteeEmail)
//		);

		emailService.sendEmail(inviteeEmail, "Invitation to Workspace: " + workspaceName, msg);

		if (event.getInvitee() != null) {
			notificationService.createNotification(
					event.getInvitee(),
					NotificationType.WORKSPACE_INVITATION_SENT,
					EntityType.WORKSPACE,
					event.getWorkspace().getId(),
					msg
			);

			UnifiedEvent realTimeEvent = UnifiedEvent.builder()
					.eventId(UUID.randomUUID())
					.type("WORKSPACE")
					.action("INVITATION_SENT")
					.recipientId(event.getInvitee().getId())
					.senderId(event.getInviter().getId())
					.entityType(EntityType.WORKSPACE.name())
					.entityId(event.getWorkspace().getId().toString())
					.payload(Map.of(
							"workspaceName", workspaceName,
							"inviterName", inviterName,
							"message", msg
					))
					.timestamp(Instant.now())
					.build();

			redisEventPublisherService.publish(realTimeEvent);
		}
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceInvitationAcceptedEvent(WorkspaceInvitationAcceptedEvent event) {
		String inviteeName = event.getInvitee().getFirstName() + " " + event.getInvitee().getLastName();
		String workspaceName = event.getWorkspace().getName();
		UUID inviterId = event.getInvitation().getInviter().getId();

		String msg = String.format("%s accepted your invitation and joined workspace '%s'.", inviteeName, workspaceName);

		notificationService.createNotification(
				event.getInvitation().getInviter(),
				NotificationType.WORKSPACE_MEMBER_ADDED,
				EntityType.WORKSPACE,
				event.getWorkspace().getId(),
				msg
		);

		activityLogService.logActivity(
				event.getWorkspace().getId(),
				event.getInvitee().getId(),
				inviterId,
				"WORKSPACE_MEMBER_ADDED",
				String.format("Added %s to workspace via invitation", inviteeName)
		);

		UnifiedEvent realTimeEvent = UnifiedEvent.builder()
				.eventId(UUID.randomUUID())
				.type("WORKSPACE")
				.action("MEMBER_ADDED")
				.recipientId(inviterId)
				.senderId(event.getInvitee().getId())
				.entityType(EntityType.WORKSPACE.name())
				.entityId(event.getWorkspace().getId().toString())
				.payload(Map.of(
						"workspaceName", workspaceName,
						"inviteeName", inviteeName,
						"message", msg
				))
				.timestamp(Instant.now())
				.build();

		redisEventPublisherService.publish(realTimeEvent);
	}
}