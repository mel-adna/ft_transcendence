package com.teampulse.backend.service;

import com.teampulse.backend.exception.EmailDeliveryException;
import com.teampulse.backend.security.utils.EmailUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

	private final JavaMailSender mailSender;

	@Value("${spring.mail.username}")
	private String fromEmail;


	public void sendEmail(String to, String subject, String body) {
		log.info("Initiating email dispatch sequence to: {}", EmailUtils.maskEmail(to));

		try {
			SimpleMailMessage message = new SimpleMailMessage();
			message.setFrom(fromEmail);
			message.setTo(to);
			message.setSubject(subject);
			message.setText(body);

			mailSender.send(message);
			log.info("Email successfully sent to: {}", EmailUtils.maskEmail(to));
		}
		catch (MailException ex) {
			log.error("Infrastructure Failure: Unable to deliver email to [{}]. Error type: {}", EmailUtils.maskEmail(to), ex.getClass().getSimpleName());
			throw new EmailDeliveryException("Failed to deliver email due to a mail server infrastructure failure.", ex);
		}
		catch (Exception ex) {
			log.error("Unexpected error during email dispatch to [{}]: {}", EmailUtils.maskEmail(to), ex.getClass().getSimpleName());
			throw new EmailDeliveryException("An unexpected error occurred while sending email.", ex);
		}
	}


	@Async
	public void sendWelcomeEmail(String to, String firstName) {
		String name = (firstName != null && !firstName.isBlank()) ? firstName : "there";
		String subject = "Welcome to Team-Pulse! 👋";
		String body = String.format(
				"Hello %s,\n\n" +
						"Welcome to Team-Pulse! Your account has been successfully activated.\n" +
						"You can now log in and start collaborating with your team.\n\n" +
						"Best regards,\nThe Team-Pulse Team", name
		);
		sendEmail(to, subject, body);
	}
}
