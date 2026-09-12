package com.teampulse.backend.scheduler;

import com.teampulse.backend.repository.PasswordResetTokenRepository;
import com.teampulse.backend.repository.RefreshTokenRepository;
import com.teampulse.backend.repository.UserRepository;
import com.teampulse.backend.repository.VerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;

@Component
@Slf4j
@RequiredArgsConstructor
public class DatabaseCleanupScheduler {
	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final VerificationCodeRepository verificationCodeRepository;
	private final PasswordResetTokenRepository passwordResetTokenRepository;

	@Scheduled(cron = "0 0 3 * * ?")
	@Transactional
	public void dailyDatabaseCleanup() {
		log.info("[Database Cleanup] Starting daily maintenance job...");


		int deletedRefreshTokens = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
		if (deletedRefreshTokens > 0)
			log.info("[Database Cleanup] Purged {} expired refresh tokens.", deletedRefreshTokens);


		int deletedResetTokens = passwordResetTokenRepository.deleteByExpiryDateBefore(Instant.now());
		if (deletedResetTokens > 0)
			log.info("[Database Cleanup] Purged {} expired password reset tokens.", deletedResetTokens);


		LocalDateTime cutoffDate = LocalDateTime.now().minusHours(24);

		verificationCodeRepository.deleteUnverifiedCodesBefore(cutoffDate);
		int deletedUnverifiedUsers = userRepository.hardDeleteUnverifiedAccounts(cutoffDate);
		if (deletedUnverifiedUsers > 0)
			log.info("[Database Cleanup] Purged {} unverified accounts created before {}.",
					deletedUnverifiedUsers, cutoffDate);


		log.info("[Database Cleanup] Daily maintenance job completed successfully.");
	}
}
