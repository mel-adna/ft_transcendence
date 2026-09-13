package com.teampulse.backend.repository;

import java.time.LocalDateTime;
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
	void deleteByUser(User user);

	@Modifying
	@Query("DELETE FROM VerificationCode v WHERE v.user.enabled = false AND v.user.createdAt < :cutoffDate")
	int deleteUnverifiedCodesBefore(@Param("cutoffDate") LocalDateTime cutoffDate);
}
