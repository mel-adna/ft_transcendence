package com.teampulse.backend.scheduler;

import com.teampulse.backend.repository.*;
import com.teampulse.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
@Slf4j
@RequiredArgsConstructor
public class DatabaseCleanupScheduler {
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordResetTokenRepository passwordResetTokenRepository;
	private final UserService userService;

	@Scheduled(cron = "0 0 3 * * ?")
	@Transactional
	public void dailyDatabaseCleanup() {
		log.info("[Database Cleanup] Starting daily maintenance job...");

		int deletedRefreshTokens = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
		if (deletedRefreshTokens > 0) {
			log.info("[Database Cleanup] Purged {} expired refresh tokens.", deletedRefreshTokens);
		}

		int deletedResetTokens = passwordResetTokenRepository.deleteByExpiryDateBefore(Instant.now());
		if (deletedResetTokens > 0) {
			log.info("[Database Cleanup] Purged {} expired password reset tokens.", deletedResetTokens);
		}

		userService.hardDeleteUnverifiedAccounts(24);

		log.info("[Database Cleanup] Daily maintenance job completed successfully.");
	}
}
