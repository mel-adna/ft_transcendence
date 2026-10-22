package com.teampulse.backend.service;

import com.teampulse.backend.exception.EmailDeliveryException;
import com.teampulse.backend.security.utils.EmailUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

	private final JavaMailSender mailSender;
	private final ApplicationEventPublisher eventPublisher;
	public record MailDispatch(String to, String subject, String body) {}

	@Value("${spring.mail.username}")
	private String fromEmail;


	public void sendEmail(String to, String subject, String body) {
		MailDispatch mail = new MailDispatch(to, subject, body);
		if (TransactionSynchronizationManager.isActualTransactionActive()
				&& TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override public void afterCommit() { eventPublisher.publishEvent(mail); }
			});
		} else {
			eventPublisher.publishEvent(mail);
		}
	}

	@Async
	@EventListener
	public void dispatch(MailDispatch mail) {
		String to = mail.to(); String subject = mail.subject(); String body = mail.body();
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

	public void sendGdprExportEmail(String to, String firstName, String exportedAtFormatted) {
		String name = (firstName != null && !firstName.isBlank()) ? firstName : "there";
		String subject = "TeamPulse - GDPR Personal Data Export Confirmation 📦";
		String body = String.format(
				"Hello %s,\n\n" +
						"Your request for a full export of your personal data on TeamPulse was successfully processed on %s.\n\n" +
						"The requested JSON data payload has been generated and delivered via your active session.\n" +
						"If you did not initiate this request, please change your password and secure your account immediately.\n\n" +
						"Best regards,\nThe TeamPulse Security & Privacy Team",
				name, exportedAtFormatted
		);
		sendEmail(to, subject, body);
	}
}
