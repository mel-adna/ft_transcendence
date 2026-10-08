package com.teampulse.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import org.springframework.stereotype.Repository;


@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
	Optional<RefreshToken> findByToken(String token);

	@Modifying
	@Query(value = "DELETE FROM refresh_tokens WHERE token = :token RETURNING *", nativeQuery = true)
	Optional<RefreshToken> findAndDeleteByToken(@Param("token") String token);

	@Modifying
	int deleteByUser(User user);

	@Modifying
	void deleteByUserId(UUID userId);

	@Modifying
	void deleteByToken(String token);

	@Modifying
	@Query("DELETE FROM RefreshToken r WHERE r.expiryDate < :now")
	int deleteByExpiryDateBefore(@Param("now") Instant now);

	@Modifying
	@Query("DELETE FROM RefreshToken r WHERE r.user.id IN :userIds")
	void deleteByUserIdIn(@Param("userIds") List<UUID> userIds);
}