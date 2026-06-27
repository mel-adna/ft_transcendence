package com.teampulse.backend.service;

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

    @Async
    public void sendEmail(String to, String subject, String body) {
        log.info("Initiating email dispatch sequence to: {}", to);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("no-reply@teampulse.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Email successfully sent to: {}", to);
        } catch (Exception e) {
            log.error("Infrastructure Error: Failed to send email to [{}]. Reason: {}", to, e.getMessage());
        }
    }
}
