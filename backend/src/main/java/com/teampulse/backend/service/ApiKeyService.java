package com.teampulse.backend.service;

import com.teampulse.backend.dto.response.ApiKeyResponse;
import com.teampulse.backend.exception.ResourceNotFoundException;
import com.teampulse.backend.model.ApiKey;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.ApiKeyRepository;
import com.teampulse.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class ApiKeyService {
	private final ApiKeyRepository apiKeyRepository;
	private final UserRepository userRepository;

	private static final String PREFIX = "tp_live_";

	@Transactional
	public String generateOrRotateApiKey(String userEmail) {
		User user = userRepository.findByEmail(userEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

		apiKeyRepository.deleteByUser(user);
		apiKeyRepository.flush();

		byte[] randomBytes = new byte[24];
		new SecureRandom().nextBytes(randomBytes);
		String rawSecret = HexFormat.of().formatHex(randomBytes);
		String fullKey = PREFIX + rawSecret;

		String hashedKey = hashKey(fullKey);
		String prefixDisplay = fullKey.substring(0, 14) + "...";

		ApiKey apiKey = ApiKey.builder()
				.hashKey(hashedKey)
				.keyPrefix(prefixDisplay)
				.user(user)
				.active(true)
				.build();

		apiKeyRepository.saveAndFlush(apiKey);

		return fullKey;
	}

	@Transactional
	public User validateApiKeyAndGetUser(String rawKey) {
		if (rawKey == null || !rawKey.startsWith(PREFIX))
			return null;

		String hashKey = hashKey(rawKey);
		ApiKey apiKey = apiKeyRepository.findByHashKeyAndActiveTrue(hashKey)
				.orElse(null);

		if (apiKey == null)
			return null;

		apiKey.setLastUsedAt(Instant.now());
		apiKeyRepository.save(apiKey);

		return apiKey.getUser();
	}

	@Transactional
	public void revokeApiKey(String userEmail) {
		User user = userRepository.findByEmail(userEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

		apiKeyRepository.deleteByUser(user);
		apiKeyRepository.flush();
	}

	@Transactional(readOnly = true)
	public ApiKeyResponse getApiKeyInfo(String userEmail) {
		User user = userRepository.findByEmail(userEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

		ApiKey apiKey = apiKeyRepository.findByUser(user)
				.orElseThrow(() -> new ResourceNotFoundException("No active API key found for this user."));

		return ApiKeyResponse.builder()
				.keyPrefix(apiKey.getKeyPrefix())
				.active(apiKey.isActive())
				.lastUsedAt(apiKey.getLastUsedAt())
				.createdAt(apiKey.getCreatedAt())
				.build();
	}

	public static String hashKey(String input) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		} catch (NoSuchAlgorithmException e) {
			throw new RuntimeException("SHA-256 algorithm unavailable", e);
		}
	}
}
