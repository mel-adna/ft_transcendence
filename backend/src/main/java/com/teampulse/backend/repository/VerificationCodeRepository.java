package com.teampulse.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.VerificationCode;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {
	Optional<VerificationCode> findByCodeAndUser(String code, User user);

	@Modifying
	void deleteByUser(User user);

	@Modifying
	void deleteByUserId(UUID userId);

	@Modifying
	@Query("DELETE FROM VerificationCode v WHERE v.user.id IN :userIds")
	void deleteByUserIdIn(@Param("userIds") List<UUID> userIds);

	@Modifying
	@Query("DELETE FROM VerificationCode v WHERE v.user.enabled = false AND v.user.createdAt < :cutoffDate")
	void deleteUnverifiedCodesBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
}