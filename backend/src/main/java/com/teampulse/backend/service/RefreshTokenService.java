package com.teampulse.backend.service;

import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.RefreshTokenRepository;
import com.teampulse.backend.security.utils.EmailUtils;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.security.SecureRandom;
import java.util.Base64;


@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class RefreshTokenService {
	private final RefreshTokenRepository refreshTokenRepository;
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	@Value("${app.jwt.refresh-expiration-ms}")
	private Long refreshExpirationMs;

	@Getter
	@AllArgsConstructor
	public static class RefreshTokenResult {
		private final String rawToken;
		private final RefreshToken refreshToken;
	}


	@Transactional(rollbackFor = Exception.class)
	public RefreshTokenResult createRefreshToken(User user, String clientIp, String userAgent) {
		byte[] randomBytes = new byte[32];
		SECURE_RANDOM.nextBytes(randomBytes);
		String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

		String tokenHash = DigestUtils.sha256Hex(rawToken);

		RefreshToken refreshToken = RefreshToken.builder()
				.user(user)
				.tokenHash(tokenHash)
				.expiryDate(Instant.now().plusMillis(refreshExpirationMs))
				.clientIp(clientIp)
				.userAgent(truncateUserAgent(userAgent))
				.revoked(false)
				.consumed(false)
				.build();

		RefreshToken savedToken = refreshTokenRepository.save(refreshToken);
		return new RefreshTokenResult(rawToken, savedToken);
	}

	@Transactional(rollbackFor = Exception.class)
	public RefreshToken verifyAndRotateToken(String rawTokenStr, String currentClientIp, String currentUserAgent) {
		if (rawTokenStr == null || rawTokenStr.isBlank()) {
			throw new UnauthorizedAccessException("Refresh token is required.");
		}

		String tokenHash = DigestUtils.sha256Hex(rawTokenStr);

		// F03 Fix: Use pessimistic lock to prevent concurrent execution races
		RefreshToken token = refreshTokenRepository.findForRotationByHash(tokenHash)
				.orElseThrow(() -> {
					// F02 Fix: Do NOT log the raw token or hash value in warning logs
					log.warn("Refresh token validation failed: Token not found in database.");
					return new UnauthorizedAccessException("Invalid or expired refresh token. Please log in again.");
				});

		if (token.isConsumed() || token.isRevoked()) {
			log.warn("SECURITY ALERT: Attempted reuse of consumed/revoked refresh token for user: {}",
					EmailUtils.maskEmail(token.getUser().getEmail()));
			refreshTokenRepository.deleteByUserId(token.getUser().getId());
			throw new UnauthorizedAccessException("Security violation: Token was already used. All sessions terminated.");
		}

		if (token.getExpiryDate().isBefore(Instant.now())) {
			refreshTokenRepository.delete(token);
			throw new UnauthorizedAccessException("Refresh token has expired. Please log in again.");
		}

		String truncatedUserAgent = truncateUserAgent(currentUserAgent);
		boolean ipMismatch = token.getClientIp() != null && !token.getClientIp().equals(currentClientIp);
		boolean agentMismatch = token.getUserAgent() != null && !token.getUserAgent().equals(truncatedUserAgent);

		if (ipMismatch || agentMismatch) {
			log.warn("Client mismatch for user: {}. IP mismatch: {}, Agent mismatch: {}",
					EmailUtils.maskEmail(token.getUser().getEmail()), ipMismatch, agentMismatch);
			refreshTokenRepository.delete(token);
			throw new UnauthorizedAccessException("Security alert: Client context mismatch. Session invalidated.");
		}

		token.setConsumed(true);
		token.setRevoked(true);
		refreshTokenRepository.save(token);

		return token;
	}

	@Transactional(rollbackFor = Exception.class)
	public void deleteByRawToken(String rawTokenStr) {
		if (rawTokenStr != null && !rawTokenStr.isBlank()) {
			String tokenHash = DigestUtils.sha256Hex(rawTokenStr);
			refreshTokenRepository.deleteByTokenHash(tokenHash);
		}
	}

	@Transactional(rollbackFor = Exception.class)
	public void deleteByUserId(User user) {
		refreshTokenRepository.deleteByUserId(user.getId());
	}

	private String truncateUserAgent(String userAgent) {
		if (userAgent == null) return null;
		return userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent;
	}
}
