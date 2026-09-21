package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.WorkspaceDeletedEvent;
import com.teampulse.backend.event.WorkspaceMemberAddedEvent;
import com.teampulse.backend.event.WorkspaceMemberRemovedEvent;
import com.teampulse.backend.event.WorkspaceUpdatedEvent;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WorkspaceEventListener {
	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;
	private final WorkspaceMemberRepository workspaceMemberRepository;


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

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceUpdatedEvent(WorkspaceUpdatedEvent event) {
		UUID adminId = event.getUser() != null ? event.getUser().getId() : null;
		String adminName = event.getUser() != null ? event.getUser().getFirstName() : "Admin";

		String msg = String.format("Workspace name has been updated to '%s' by %s.",
				event.getWorkspace().getName(), adminName);

		UUID workspaceId = event.getWorkspace().getId();

		List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);

		members.forEach(member -> {
			if (adminId != null && adminId.equals(member.getUser().getId())) return;

			UnifiedEvent realTimeEvent = UnifiedEvent.builder()
					.eventId(UUID.randomUUID())
					.type("WORKSPACE")
					.action("UPDATED")
					.recipientId(member.getUser().getId())
					.senderId(adminId)
					.entityType(EntityType.WORKSPACE.name())
					.entityId(workspaceId.toString())
					.payload(Map.of(
							"workspaceName", event.getWorkspace().getName(),
							"adminName", adminName,
							"message", msg
					))
					.timestamp(Instant.now())
					.build();

			redisEventPublisherService.publish(realTimeEvent);
		});
	}


	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceDeletedEvent(WorkspaceDeletedEvent event) {
		UUID adminId = event.getAdmin() != null ? event.getAdmin().getId() : null;
		String adminName = event.getAdmin() != null ? event.getAdmin().getFirstName() : "Admin";

		String msg = String.format("The workspace '%s' has been deleted by %s.",
				event.getWorkspaceName(), adminName);

		event.getMemberIds().forEach(memberId -> {
			if (adminId != null && adminId.equals(memberId)) return;

			UnifiedEvent realTimeEvent = UnifiedEvent.builder()
					.eventId(UUID.randomUUID())
					.type("WORKSPACE")
					.action("DELETED")
					.recipientId(memberId)
					.senderId(adminId)
					.entityType(EntityType.WORKSPACE.name())
					.entityId(event.getWorkspaceId().toString())
					.payload(Map.of(
							"workspaceName", event.getWorkspaceName(),
							"adminName", adminName,
							"message", msg
					))
					.timestamp(Instant.now())
					.build();

			redisEventPublisherService.publish(realTimeEvent);
		});
	}


	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceMemberRemovedEvent(WorkspaceMemberRemovedEvent event) {
		boolean isAdminNull = event.getAdmin() == null;
		String adminName = isAdminNull ? "Workspace Admin" : event.getAdmin().getFirstName();
		UUID adminId = isAdminNull ? null : event.getAdmin().getId();

		String msg = String.format("You have been removed from workspace '%s' by %s.",
				event.getWorkspace().getName(), adminName);

		notificationService.createNotification(
				event.getRemovedUser(),
				NotificationType.WORKSPACE_MEMBER_REMOVED,
				EntityType.WORKSPACE,
				event.getWorkspace().getId(),
				msg);

		UnifiedEvent realTimeEvent = UnifiedEvent.builder()
				.eventId(UUID.randomUUID())
				.type("WORKSPACE")
				.action("MEMBER_REMOVED")
				.recipientId(event.getRemovedUser().getId())
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
