package com.teampulse.backend.event;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.teampulse.backend.model.Task;
import com.teampulse.backend.model.enums.EntityType;
import com.teampulse.backend.model.enums.NotificationType;
import com.teampulse.backend.repository.TaskRepository;
import com.teampulse.backend.service.ActivityLogService;
import com.teampulse.backend.service.NotificationService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class TaskEventListener {

    private final NotificationService notificationService;
	private final ActivityLogService activityLogService;
	private final TaskRepository taskRepository;


	@Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	@Transactional
    public void handleTaskCompletedEvent(TaskCompletedEvent event) {
        // Task task = event.getTask();

		Task task = taskRepository.findById(event.getTask().getId()).orElse(null);

		if (task == null) {
			log.warn("Task not found for event logging: {}", event.getTask().getId());
            return;
		}
        
        log.info("Successfully intercepted TaskCompletedEvent for Task ID: {} which occurred at: {}", 
                																			task.getId(), event.getTimeAt());

        try {
            processActivityLogging(task, event);
        } catch (Exception e) {
            log.error("Failed to create ActivityLog for completed task ID: {}. Error: {}", task.getId(), e.getMessage());
        }

        try {
            sendTaskCompletedNotifications(task);
        } catch (Exception e) {
            log.error("Failed to send notifications for completed task ID: {}. Error: {}", task.getId(), e.getMessage());
        }
    }


    private void processActivityLogging(Task task, TaskCompletedEvent event) {
        log.info("Writing to Database [ActivityLog table]: User '{}' completed task '{}' in workspace '{}' at {}", 
                task.getCreator().getEmail(), task.getTitle(), task.getWorkspace().getName(), event.getTimeAt());
        
        activityLogService.logActivity(task.getWorkspace().getId(), task.getCreator().getId(),
            							task.getId(), "TASK_COMPLETED", "Completed the task: " + task.getTitle());
    }

    private void sendTaskCompletedNotifications(Task task) {
        log.info("Sending notification dispatch... Persisting DB alert regarding task: {}", task.getTitle());

        if (task.getAssignee() != null) {
            String alertMessage = String.format("The task '%s' assigned to you has been marked as COMPLETED.", task.getTitle());
            
            notificationService.createNotification(
                task.getAssignee(),
                NotificationType.TASK_COMPLETED,
                EntityType.TASK,
                task.getId(),
                alertMessage
            );
            
            log.info("Notification successfully persisted for Assignee: {}", task.getAssignee().getEmail());
        }
    }
}
