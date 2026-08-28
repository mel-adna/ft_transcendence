package com.teampulse.backend.event.listner;

import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.TaskCommentCreatedEvent;
import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.TaskComment;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.TaskCommentRepository;
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
public class TaskCommentEventListener {
	private final TaskCommentRepository taskCommentRepository;
	private final NotificationService notificationService;
	private final EmailService emailService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
	public void handleTaskCommentCreatedEvent(TaskCommentCreatedEvent event) {
		TaskComment comment = taskCommentRepository.findById(event.getComment().getId()).orElse(null);
		if (comment == null)
			return;

		Task task = comment.getTask();
		User author = comment.getAuthor();

		if (task.getAssignee() != null && !task.getAssignee().getId().equals(author.getId()))
			sendCommentNotification(task.getAssignee(), author, task, comment);

		if (task.getCreator() != null
				&& !task.getCreator().getId().equals(author.getId())
				&& (task.getAssignee() == null || task.getCreator().getId().equals(task.getAssignee().getId()))) {
			sendCommentNotification(task.getCreator(), author, task, comment);
		}
	}

	private void sendCommentNotification(User recipient, User author, Task task, TaskComment comment) {
		String msg = String.format("%s commented on task '%s': \"%s\"",
				author.getFirstName(), task.getTitle(), comment.getContent());

		notificationService.createNotification(
				recipient,
				NotificationType.TASK_COMMENTED,
				EntityType.TASK_COMMENT,
				task.getId(),
				msg);

		emailService.sendEmail(
				recipient.getEmail(),
				"New Comment on Task: " + task.getTitle(),
				msg);
	}
}
