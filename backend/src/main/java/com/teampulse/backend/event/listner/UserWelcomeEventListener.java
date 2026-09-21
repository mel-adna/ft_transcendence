package com.teampulse.backend.event.listner;

import com.teampulse.backend.event.UserWelcomeEvent;
import com.teampulse.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class UserWelcomeEventListener {
	private final EmailService emailService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void handleUserWelcome(UserWelcomeEvent event) {
		emailService.sendWelcomeEmail(event.getEmail(), event.getFirstName());
	}
}
