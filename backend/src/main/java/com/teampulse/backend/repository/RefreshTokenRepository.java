package com.teampulse.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import org.springframework.stereotype.Repository;


@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
	Optional<RefreshToken> findByTokenHash(String tokenHash);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT r FROM RefreshToken r JOIN FETCH r.user WHERE r.tokenHash = :tokenHash")
	Optional<RefreshToken> findForRotationByHash(@Param("tokenHash") String tokenHash);

	@Modifying
	int deleteByUser(User user);

	@Modifying
	void deleteByUserId(UUID userId);

	@Modifying
	void deleteByTokenHash(String tokenHash);

	@Modifying
	@Query("DELETE FROM RefreshToken r WHERE r.expiryDate < :now OR r.consumed = true OR r.revoked = true")
	int deleteExpiredOrRevokedTokens(@Param("now") Instant now);

	@Modifying
	@Query("DELETE FROM RefreshToken r WHERE r.user.id IN :userIds")
	void deleteByUserIdIn(@Param("userIds") List<UUID> userIds);
}