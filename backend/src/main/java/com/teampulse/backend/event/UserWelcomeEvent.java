package com.teampulse.backend.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Clock;
import java.time.Instant;

@Getter
public class UserWelcomeEvent extends ApplicationEvent {
	private final String email;
	private final String firstName;
	private final Instant timeAt;

	public UserWelcomeEvent(Object source, String email, String firstName) {
		super(source);

		if (email == null || email.isBlank())
			throw new IllegalArgumentException("Email payload inside UserWelcomeEvent cannot be null or blank");

		this.email = email;
		this.firstName = firstName;
		this.timeAt = Instant.now(Clock.systemUTC());
	}
}
