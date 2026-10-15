package com.teampulse.backend.event.listner;

import com.teampulse.backend.dto.messaging.UnifiedEvent;
import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;
import com.teampulse.backend.event.UserWelcomeEvent;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.service.EmailService;
import com.teampulse.backend.service.NotificationService;
import com.teampulse.backend.service.RedisEventPublisherService;
import com.teampulse.backend.service.UserService;
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
public class UserWelcomeEventListener {
	private final EmailService emailService;
	private final RedisEventPublisherService redisEventPublisherService;
	private final UserRepository userRepository;
	private final NotificationService notificationService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleUserWelcome(UserWelcomeEvent event) {
		emailService.sendWelcomeEmail(event.getEmail(), event.getFirstName());

		String welcomeMsg = String.format("Welcome to TeamPulse, %s! We are glad to have you.", event.getFirstName());

		userRepository.findById(event.getUserId()).ifPresent(user -> {
			notificationService.createNotification(
					user,
					NotificationType.USER_WELCOME,
					EntityType.WORKSPACE,
					event.getUserId(),
					welcomeMsg
			);
		});

		UnifiedEvent realTimeEvent = UnifiedEvent.builder()
				.eventId(UUID.randomUUID())
				.type("SYSTEM")
				.action("WELCOME")
				.recipientId(event.getUserId())
				.senderId(null)
				.entityType("USER")
				.entityId(event.getUserId().toString())
				.payload(Map.of(
						"firstName", event.getFirstName(),
						"message", welcomeMsg
				))
				.timestamp(Instant.now())
				.build();

		redisEventPublisherService.publish(realTimeEvent);
	}
}
