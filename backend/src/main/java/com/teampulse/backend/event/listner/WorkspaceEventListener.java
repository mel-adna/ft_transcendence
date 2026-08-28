package com.teampulse.backend.event.listner;

import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.WorkspaceMemberAddedEvent;
import com.teampulse.backend.service.ActivityLogService;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class WorkspaceEventListener {
	private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final EmailService emailService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleWorkspaceMemberAddedEvent(WorkspaceMemberAddedEvent event) {
		String msg = String.format("You have been added to workspace '%s' by %s.",
				event.getWorkspace().getName(), event.getAdmin().getFirstName());

		notificationService.createNotification(
				event.getAddedUser(),
				NotificationType.WORKSPACE_MEMBER_ADDED,
				EntityType.WORKSPACE,
				event.getWorkspace().getId(),
				msg);

		activityLogService.logActivity(
				event.getWorkspace().getId(),
				event.getAdmin().getId(),
				event.getAddedUser().getId(),
				"WORKSPACE_MEMBER_ADDED",
				String.format("Added %s to workspace", event.getAddedUser().getEmail()));

		emailService.sendEmail(
				event.getAddedUser().getEmail(),
				"Welcome to Workspace: " + event.getWorkspace().getName(),
				msg);
	}
}
