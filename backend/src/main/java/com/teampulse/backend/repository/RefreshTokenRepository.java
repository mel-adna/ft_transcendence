package com.teampulse.backend.repository;

import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
	Optional<RefreshToken> findByTokenHash(String tokenHash);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT r FROM RefreshToken r JOIN FETCH r.user WHERE r.tokenHash = :tokenHash")
	Optional<RefreshToken> findForRotationByHash(@Param("tokenHash") String tokenHash);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	int deleteByUser(User user);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("DELETE FROM RefreshToken r WHERE r.user.id = :userId")
	void deleteByUserId(@Param("userId") UUID userId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	void deleteByTokenHash(String tokenHash);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("DELETE FROM RefreshToken r WHERE r.expiryDate <= :now")
	int deleteExpiredOrRevokedTokens(@Param("now") Instant now);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("DELETE FROM RefreshToken r WHERE r.user.id IN :userIds")
	void deleteByUserIdIn(@Param("userIds") List<UUID> userIds);
}