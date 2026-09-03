package com.teampulse.backend.service;

import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.RefreshTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {
	private final RefreshTokenRepository refreshTokenRepository;

	@Value("${app.jwt.refresh-expiration-ms}")
	private Long refreshExpirationMs;

	@Scheduled(cron = "0 0 3 * * ?")
	@Transactional
	public void purgeExpiredToken() {
		int deletedCount = refreshTokenRepository.deleteByExpiryDateBefore(Instant.now());
		if (deletedCount > 0) {
			log.info("Scheduled Job: Cleaned up {} expired refresh tokens from database.", deletedCount);
		}
	}

	@Transactional
	public RefreshToken createRefreshToken(User user) {
		RefreshToken refreshToken = RefreshToken.builder()
				.user(user)
				.token(UUID.randomUUID().toString())
				.expiryDate(Instant.now().plusMillis(refreshExpirationMs))
				.revoked(false)
				.build();

		return refreshTokenRepository.save(refreshToken);
	}

	@Transactional
	public RefreshToken verifyExpirationAndRevocation(String tokenStr) {
		RefreshToken token = refreshTokenRepository.findByToken(tokenStr)
				.orElseThrow(() -> new UnauthorizedAccessException("Invalid or expired refresh token. Please log in again."));

		if (token.isRevoked() || token.getExpiryDate().isBefore(Instant.now())) {
			refreshTokenRepository.delete(token);
			throw new UnauthorizedAccessException("Refresh token has expired or been revoked. Please log in again.");
		}

		return token;
	}

	@Transactional
	public void deleteByToken(String token) {
		refreshTokenRepository.deleteByToken(token);
	}

	@Transactional
	public void deleteByUserId(User user) {
		refreshTokenRepository.deleteByUser(user);
	}
}
