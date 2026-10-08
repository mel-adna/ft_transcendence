package com.teampulse.backend.service;

import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.RefreshTokenRepository;
import com.teampulse.backend.security.utils.EmailUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;


@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(rollbackFor = Exception.class)
public class RefreshTokenService {
	private final RefreshTokenRepository refreshTokenRepository;

	@Value("${app.jwt.refresh-expiration-ms}")
	private Long refreshExpirationMs;


	@Transactional
	public RefreshToken createRefreshToken(User user, String clientIp, String userAgent) {
		RefreshToken refreshToken = RefreshToken.builder()
				.user(user)
				.token(UUID.randomUUID().toString())
				.expiryDate(Instant.now().plusMillis(refreshExpirationMs))
				.clientIp(clientIp)
				.userAgent(truncateUserAgent(userAgent))
				.revoked(false)
				.build();

		return refreshTokenRepository.save(refreshToken);
	}

	@Transactional
	public RefreshToken verifyExpirationAndRevocation(String tokenStr, String currentClientIp, String currentUserAgent) {
		RefreshToken token = refreshTokenRepository.findByToken(tokenStr)
				.orElseThrow(() -> {
					log.warn("Refresh token not found in database: {}", tokenStr);
					return new UnauthorizedAccessException("Invalid or expired refresh token. Please log in again.");
				});

		if (token.isRevoked()) {
			log.warn("Attempted reuse of revoked token for user: {}", EmailUtils.maskEmail(token.getUser().getEmail()));
			refreshTokenRepository.deleteByUserId(token.getUser().getId());
			throw new UnauthorizedAccessException("Token was already used. Session terminated.");
		}

		if (token.getExpiryDate().isBefore(Instant.now())) {
			refreshTokenRepository.delete(token);
			throw new UnauthorizedAccessException("Refresh token has expired. Please log in again.");
		}

		String truncatedUserAgent = truncateUserAgent(currentUserAgent);
		boolean ipMismatch = token.getClientIp() != null && !token.getClientIp().equals(currentClientIp);
		boolean agentMismatch = token.getUserAgent() != null && !token.getUserAgent().equals(truncatedUserAgent);

		if (ipMismatch || agentMismatch) {
			log.warn("Client mismatch! IP mismatch: {}, Agent mismatch: {}", ipMismatch, agentMismatch);
			refreshTokenRepository.delete(token);
			throw new UnauthorizedAccessException("Security alert: Client context mismatch. Session invalidated.");
		}

		refreshTokenRepository.delete(token);

		return token;
	}

	@Transactional
	public void deleteByToken(String token) {
		refreshTokenRepository.deleteByToken(token);
	}

	@Transactional
	public void deleteByUserId(User user) {
		refreshTokenRepository.deleteByUserId(user.getId());
	}

	private String truncateUserAgent(String userAgent) {
		if (userAgent == null) return null;
		return userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent;
	}
}
