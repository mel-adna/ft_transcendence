package com.teampulse.backend.event;

import com.teampulse.backend.model.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Getter
public class UserWelcomeEvent extends ApplicationEvent {
	private final UUID userId;
	private final String email;
	private final String firstName;
	private final Instant timeAt;

	public UserWelcomeEvent(Object source, UUID userId, String email, String firstName) {
		super(source);

		if (userId == null)
			throw new IllegalArgumentException("UserId inside UserWelcomeEvent cannot be null");
		if (email == null || email.isBlank())
			throw new IllegalArgumentException("Email payload inside UserWelcomeEvent cannot be null or blank");

		this.userId = userId;
		this.email = email;
		this.firstName = firstName;
		this.timeAt = Instant.now(Clock.systemUTC());
	}
}
