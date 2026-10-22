package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.WorkspaceDeletedEvent;
import com.teampulse.backend.event.WorkspaceMemberRemovedEvent;
import com.teampulse.backend.event.WorkspaceUpdatedEvent;
import com.teampulse.backend.model.Notification;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.WorkspaceMember;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.WorkspaceMemberRepository;
import com.teampulse.backend.service.NotificationService;
import com.teampulse.backend.service.RedisEventPublisherService;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
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
	private final RedisEventPublisherService redisEventPublisherService;
	private final WorkspaceMemberRepository workspaceMemberRepository;
	private final UserRepository userRepository;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void handleWorkspaceUpdatedEvent(WorkspaceUpdatedEvent event) {
		UUID adminId = event.getUser() != null ? event.getUser().id() : null;
		String adminName = getSafeAdminName(event.getUser());

		String msg = String.format("Workspace name has been updated to '%s' by %s.",
				event.getWorkspace().name(), adminName);

		UUID workspaceId = event.getWorkspace().id();
		List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);

		members.forEach(member -> {
			if (adminId != null && adminId.equals(member.getUser().getId())) return;

			Notification notification = notificationService.createNotification(
					member.getUser(),
					NotificationType.WORKSPACE_UPDATED,
					EntityType.WORKSPACE,
					workspaceId,
					msg
			);

			UnifiedEvent realTimeEvent = UnifiedEvent.builder()
					.eventId(UUID.randomUUID())
					.type("WORKSPACE")
					.action("UPDATED")
					.recipientId(member.getUser().getId())
					.senderId(adminId)
					.entityType(EntityType.WORKSPACE.name())
					.entityId(workspaceId.toString())
					.payload(Map.of(
							"notificationId", notification.getId().toString(),
							"workspaceName", event.getWorkspace().name(),
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
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void handleWorkspaceDeletedEvent(WorkspaceDeletedEvent event) {
		UUID adminId = event.getAdmin() != null ? event.getAdmin().id() : null;
		String adminName = getSafeAdminName(event.getAdmin());

		String msg = String.format("The workspace '%s' has been deleted by %s.",
				event.getWorkspaceName(), adminName);

		event.getMemberIds().forEach(memberId -> {
			if (adminId != null && adminId.equals(memberId)) return;

			userRepository.findById(memberId).ifPresent(user -> {
				Notification notification = notificationService.createNotification(
						user,
						NotificationType.WORKSPACE_DELETED,
						EntityType.WORKSPACE,
						event.getWorkspaceId(),
						msg
				);

				UnifiedEvent realTimeEvent = UnifiedEvent.builder()
						.eventId(UUID.randomUUID())
						.type("WORKSPACE")
						.action("DELETED")
						.recipientId(memberId)
						.senderId(adminId)
						.entityType(EntityType.WORKSPACE.name())
						.entityId(event.getWorkspaceId().toString())
						.payload(Map.of(
								"notificationId", notification.getId().toString(),
								"workspaceName", event.getWorkspaceName(),
								"adminName", adminName,
								"message", msg
						))
						.timestamp(Instant.now())
						.build();

				redisEventPublisherService.publish(realTimeEvent);
			});
		});
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void handleWorkspaceMemberRemovedEvent(WorkspaceMemberRemovedEvent event) {
		String adminName = getSafeAdminName(event.getAdmin());
		UUID adminId = event.getAdmin() != null ? event.getAdmin().id() : null;

		String msg = String.format("You have been removed from workspace '%s' by %s.",
				event.getWorkspace().name(), adminName);

		User removed = event.getRemovedUser() == null ? null : userRepository.findById(event.getRemovedUser().id()).orElse(null);
		if (removed != null) {
			Notification notification = notificationService.createNotification(
					removed,
					NotificationType.WORKSPACE_MEMBER_REMOVED,
					EntityType.WORKSPACE,
					event.getWorkspace().id(),
					msg);

			UnifiedEvent realTimeEvent = UnifiedEvent.builder()
					.eventId(UUID.randomUUID())
					.type("WORKSPACE")
					.action("MEMBER_REMOVED")
					.recipientId(event.getRemovedUser().id())
					.senderId(adminId)
					.entityType(EntityType.WORKSPACE.name())
					.entityId(event.getWorkspace().id().toString())
					.payload(Map.of(
							"notificationId", notification.getId().toString(),
							"workspaceName", event.getWorkspace().name(),
							"adminName", adminName,
							"message", msg
					))
					.timestamp(Instant.now())
					.build();

			redisEventPublisherService.publish(realTimeEvent);
		}
	}

	private String getSafeAdminName(com.teampulse.backend.event.EventSnapshots.UserValue user) {
		if (user == null) return "Admin";
		String first = user.firstName() != null ? user.firstName().trim() : "";
		String last = user.lastName() != null ? user.lastName().trim() : "";
		String full = (first + " " + last).trim();
		return full.isEmpty() ? "Admin" : full;
	}
}