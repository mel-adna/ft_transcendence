package com.teampulse.backend.service;

import com.teampulse.backend.exception.BadRequestException;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.model.User;
import com.teampulse.backend.model.VerificationCode;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.VerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class VerificationService {
	private final VerificationCodeRepository verificationCodeRepository;
	private final UserRepository userRepository;
	private final EmailService emailService;

	@Transactional
	public void generateAndSendCodeForUser(User user) {
		sendCode(user);
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void genrateAndSendCodeInNewTrasactional(String email) {
		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

		sendCode(user);
	}

	private void sendCode(User user) {
		if (user.isEnabled())
			throw new BadRequestException("Account is already verified. Please log in.");

		verificationCodeRepository.deleteByUser(user);
		verificationCodeRepository.flush();

		String code = String.format("%06d", new SecureRandom().nextInt(1000000));

		VerificationCode verificationCode = VerificationCode.builder()
				.code(code)
				.user(user)
				.expiryDate(Instant.now().plusSeconds(15 * 60))
				.build();

		verificationCodeRepository.saveAndFlush(verificationCode);

		String emailBody = String.format("Hello %s,\n\nYour verification code is: %s\nIt expires in 15 minutes.",
				user.getFirstName(), code);

		emailService.sendEmail(user.getEmail(), "Verify Your Team-Pulse Account", emailBody);
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void validateAndConsumeCode(User user, String code) {
		VerificationCode verificationCode = verificationCodeRepository.findByCodeAndUser(code, user)
				.orElseThrow(() -> new BadRequestException("Invalid verification code."));

		if (verificationCode.isExpired()) {
			verificationCodeRepository.delete(verificationCode);
			verificationCodeRepository.flush();
			throw new BadRequestException("Verification code has expired. Please request a new one.");
		}

		verificationCodeRepository.delete(verificationCode);
		verificationCodeRepository.flush();
	}
}
