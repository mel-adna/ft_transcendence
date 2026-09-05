package com.teampulse.backend.service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.teampulse.backend.exception.UnauthorizedAccessException;
import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import com.teampulse.backend.repository.RefreshTokenRepository;

@ExtendWith(MockitoExtension.class)
public class RefreshTokenServiceTest {

	@Mock
	private RefreshTokenRepository refreshTokenRepository;

	@InjectMocks
	public RefreshTokenService refreshTokenService;

	private User testUser;

	@BeforeEach
	void setup() {
		ReflectionTestUtils.setField(refreshTokenService, "refreshExpirationMs", 259200000L);

		testUser = new User();
		testUser.setId(UUID.randomUUID());
		testUser.setEmail("med@gmail.com");
	}

	@Test
	@DisplayName("Should successfully create and return a valid RefreshToken")
	void createRefreshToken_Success() {
		when(refreshTokenRepository.save(any(RefreshToken.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		RefreshToken refTokResult = refreshTokenService.createRefreshToken(testUser);

		assertNotNull(refTokResult);
		assertEquals(testUser, refTokResult.getUser());
		assertNotNull(refTokResult.getToken());
		assertDoesNotThrow(() -> UUID.fromString(refTokResult.getToken()));
		assertFalse(refTokResult.isRevoked());
		assertTrue(refTokResult.getExpiryDate().isAfter(Instant.now()));
		verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
	}

	@Test
	@DisplayName("Should throw UnauthorizedAccessException and delete token when it is expired")
	void verifyExpiration_ExpiredToken_ThrowsException() {
		RefreshToken expiredRefreshToken = RefreshToken.builder()
				.token("expired_token_uuid")
				.user(testUser)
				.expiryDate(Instant.now().minusMillis(3600))
				.revoked(false)
				.build();

		when(refreshTokenRepository.findByToken("expired-token-uuid"))
				.thenReturn(Optional.of(expiredRefreshToken));

		assertThrows(UnauthorizedAccessException.class,
				() -> refreshTokenService.verifyExpirationAndRevocation("expired-token-uuid"));

		verify(refreshTokenRepository, times(1)).delete(expiredRefreshToken);
	}

	@Test
	@DisplayName("Should call deleteByExpiryDateBefore with current time during scheduled purge")
	void purgeExpiredTokens_Success() {
		when(refreshTokenRepository.deleteByExpiryDateBefore(any(Instant.class)))
				.thenReturn(3);

		refreshTokenService.purgeExpiredToken();

		verify(refreshTokenRepository, times(1))
				.deleteByExpiryDateBefore(any(Instant.class));
	}
}
