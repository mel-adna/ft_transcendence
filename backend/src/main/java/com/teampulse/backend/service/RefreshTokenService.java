package com.teampulse.backend.service;

import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.RefreshTokenRepository;
import com.teampulse.backend.security.utils.EmailUtils;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
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

	@PostConstruct
	public void validateConfiguration() {
		if (refreshExpirationMs == null || refreshExpirationMs <= 0) {
			throw new IllegalStateException("Refresh token expiration must be positive.");
		}
	}

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

	@Transactional(propagation = Propagation.REQUIRED, noRollbackFor = UnauthorizedAccessException.class)
	public RefreshToken verifyAndRotateToken(String rawTokenStr, String currentClientIp, String currentUserAgent) {
		if (rawTokenStr == null || rawTokenStr.isBlank()) {
			throw new UnauthorizedAccessException("Refresh token is required.");
		}

		String tokenHash = DigestUtils.sha256Hex(rawTokenStr);

		RefreshToken token = refreshTokenRepository.findForRotationByHash(tokenHash)
				.orElseThrow(() -> {
					log.warn("Refresh token validation failed: Token not found in database.");
					return new UnauthorizedAccessException("Invalid or expired refresh token. Please log in again.");
				});

		if (token.isConsumed() || token.isRevoked()) {
			log.warn("SECURITY ALERT: Attempted reuse of consumed/revoked refresh token for user: {}",
					EmailUtils.maskEmail(token.getUser().getEmail()));

			refreshTokenRepository.deleteByUserId(token.getUser().getId());
			refreshTokenRepository.flush();

			throw new UnauthorizedAccessException("Security violation: Token was already used. All refresh sessions revoked. Please log in again.");
		}

		if (!token.getUser().isEnabled() || token.getUser().isDeleted()) {
			refreshTokenRepository.deleteByUserId(token.getUser().getId());
			throw new UnauthorizedAccessException("Account is unavailable. Please log in again.");
		}

		if (!token.getExpiryDate().isAfter(Instant.now())) {
			refreshTokenRepository.delete(token);
			refreshTokenRepository.flush();
			throw new UnauthorizedAccessException("Refresh token has expired. Please log in again.");
		}

		String truncatedUserAgent = truncateUserAgent(currentUserAgent);
		boolean ipMismatch = token.getClientIp() != null && !token.getClientIp().equals(currentClientIp);
		boolean agentMismatch = token.getUserAgent() != null && !token.getUserAgent().equals(truncatedUserAgent);

		if (ipMismatch || agentMismatch) {
			log.warn("Client mismatch for user: {}. IP mismatch: {}, Agent mismatch: {}",
					EmailUtils.maskEmail(token.getUser().getEmail()), ipMismatch, agentMismatch);
			refreshTokenRepository.delete(token);
			refreshTokenRepository.flush();
			throw new UnauthorizedAccessException("Security alert: Client context mismatch. Session invalidated.");
		}

		token.setConsumed(true);
		token.setRevoked(true);
		refreshTokenRepository.saveAndFlush(token);

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