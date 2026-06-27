package com.teampulse.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import com.teampulse.backend.model.PasswordResetToken;
import com.teampulse.backend.model.User;


public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    
    Optional<PasswordResetToken> findByToken(String token);
    void deleteByUser(User user);
}
