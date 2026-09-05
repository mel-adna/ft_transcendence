package com.teampulse.backend.repository;

import com.teampulse.backend.model.RefreshToken;
import com.teampulse.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
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
	Optional<RefreshToken> findByToken(String token);

	@Modifying
	int deleteByUser(User user);

	@Modifying
	int deleteByToken(String token);

	@Modifying
	@Query("DELETE FROM RefreshToken r WHERE r.expiryDate < :now")
	int deleteByExpiryDateBefore(@Param("now") Instant now);

	List<RefreshToken> token(String token);
}
