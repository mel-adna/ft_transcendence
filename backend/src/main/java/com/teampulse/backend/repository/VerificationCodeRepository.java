package com.teampulse.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.teampulse.backend.model.User;
import com.teampulse.backend.model.VerificationCode;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {
	Optional<VerificationCode> findByCodeAndUser(String code, User user);
	void deleteByUser(User user);
}
