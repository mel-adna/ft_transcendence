package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.WorkspaceInvitationAcceptedEvent;
import com.teampulse.backend.event.WorkspaceInvitationSentEvent;
import com.teampulse.backend.model.User;
import com.teampulse.backend.service.ActivityLogService;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;
import com.teampulse.backend.service.RedisEventPublisherService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class WorkspaceInvitationEventListener {

	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;

	@Value("${app.frontend-url}")
	private String frontendUrl;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceInvitationSentEvent(WorkspaceInvitationSentEvent event) {
		User inviter = event.getInviter();
		String inviterName = getSafeFullName(inviter);
		UUID inviterId = inviter != null ? inviter.getId() : null;
		String workspaceName = event.getWorkspace().getName();
		String inviteeEmail = event.getInvitation().getInviteeEmail();

		boolean isRegisteredUser = event.getInvitee() != null;
		String actionUrl;
		String emailBody;

		if (isRegisteredUser) {
			actionUrl = frontendUrl + "/invitations";
			emailBody = String.format(
					"Hello,\n\n" +
							"You have been invited to join workspace '%s' by %s.\n\n" +
							"Since you already have an account, please click the link below to view and accept your invitation:\n%s\n\n" +
							"Best regards,\nTeamPulse Team",
					workspaceName, inviterName, actionUrl
			);
		} else {
			String encodedEmail = URLEncoder.encode(inviteeEmail, StandardCharsets.UTF_8);
			actionUrl = frontendUrl + "/signup?email=" + encodedEmail;
			emailBody = String.format(
					"Hello,\n\n" +
							"You have been invited to join workspace '%s' by %s.\n\n" +
							"To accept this invitation and get started, please create an account using the link below:\n%s\n\n" +
							"Best regards,\nTeamPulse Team",
					workspaceName, inviterName, actionUrl
			);
		}

		try {
			emailService.sendEmail(inviteeEmail, "Invitation to Workspace: " + workspaceName, emailBody);
		} catch (Exception ex) {
			log.error("Failed to dispatch invitation email to [{}]: {}", inviteeEmail, ex.getMessage());
		}

		if (isRegisteredUser) {
			String notificationMsg = String.format("You have been invited to join workspace '%s' by %s.", workspaceName, inviterName);

			notificationService.createNotification(
					event.getInvitee(),
					NotificationType.WORKSPACE_INVITATION_SENT,
					EntityType.WORKSPACE,
					event.getWorkspace().getId(),
					notificationMsg
			);

			UnifiedEvent realTimeEvent = UnifiedEvent.builder()
					.eventId(UUID.randomUUID())
					.type("WORKSPACE")
					.action("INVITATION_SENT")
					.recipientId(event.getInvitee().getId())
					.senderId(inviterId)
					.entityType(EntityType.WORKSPACE.name())
					.entityId(event.getWorkspace().getId().toString())
					.payload(Map.of(
							"workspaceName", workspaceName,
							"inviterName", inviterName,
							"message", notificationMsg
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
		String inviteeName = getSafeFullName(event.getInvitee());
		String workspaceName = event.getWorkspace().getName();
		User inviter = event.getInvitation().getInviter();
		UUID inviterId = inviter != null ? inviter.getId() : null;

		String msg = String.format("%s accepted your invitation and joined workspace '%s'.", inviteeName, workspaceName);

		if (inviter != null) {
			notificationService.createNotification(
					inviter,
					NotificationType.WORKSPACE_MEMBER_ADDED,
					EntityType.WORKSPACE,
					event.getWorkspace().getId(),
					msg
			);
		}

		activityLogService.logActivity(
				event.getWorkspace().getId(),
				event.getInvitee().getId(),
				inviterId != null ? inviterId : event.getInvitee().getId(),
				"WORKSPACE_MEMBER_ADDED",
				String.format("Added %s to workspace via invitation", inviteeName)
		);

		if (inviterId != null) {
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

	private String getSafeFullName(User user) {
		if (user == null) return "Deleted User";
		String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
		String last = user.getLastName() != null ? user.getLastName().trim() : "";
		String full = (first + " " + last).trim();
		return full.isEmpty() ? (user.getEmail() != null ? user.getEmail() : "Unknown User") : full;
	}
}