package com.teampulse.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teampulse.backend.dto.response.NotificationResponse;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.mapper.NotificationMapper;
import com.teampulse.backend.model.Notification;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.enums.EntityType;
import com.teampulse.backend.model.enums.NotificationType;
import com.teampulse.backend.repository.NotificationRepository;
import com.teampulse.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

    @Transactional
    public void createNotification(User recipient, NotificationType type, EntityType entityType, UUID entityId, String message) {
        log.info("Persisting new notification in DB for user: {}. Type: {}", recipient.getEmail(), type);

        Notification notification = new Notification();
        notification.setId(UUID.randomUUID());
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setEntityType(entityType);
        notification.setEntityId(entityId);
        notification.setMessage(message);
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Slice<NotificationResponse> getUserNotifications(String currentEmail, Pageable pageable) {
        log.info("Fetching paginated notification history for user: {}", currentEmail);
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + currentEmail));

        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(notificationMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(String currentEmail) {
        log.info("Fetching unread notifications list for user: {}", currentEmail);
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + currentEmail));

        List<Notification> unreadNotifications = notificationRepository.findByRecipientIdAndIsReadFalse(user.getId());
        return unreadNotifications.stream()
                .map(notificationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String currentEmail) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + currentEmail));
        
        return notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public void markAsRead(UUID notificationId, String currentEmail) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        if (!notification.getRecipient().getEmail().equalsIgnoreCase(currentEmail)) {
            log.warn("Security Alert: User '{}' tried to modify notification belonging to '{}'", currentEmail, notification.getRecipient().getEmail());
            throw new UnauthorizedAccessException("You are not authorized to modify this notification!");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
            log.info("Notification ID {} successfully marked as read.", notificationId);
        }
    }

    @Transactional
    public void markAllAsRead(String currentEmail) {
        log.info("Executing bulk mark-all-as-read pipeline for user: {}", currentEmail);
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + currentEmail));

        notificationRepository.markAllAsRead(user.getId());
        log.info("Successfully executed native database modification query for user ID: {}", user.getId());
    }
}