package com.teampulse.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.teampulse.backend.enums.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import com.teampulse.backend.model.User;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
	Optional<User> findByEmail(String email);
	List<User> findByEmailContainingIgnoreCase(String email);
	List<User> findTop10ByEmailContainingIgnoreCase(String email);

	Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);

	@Modifying
	@Query("DELETE FROM User u WHERE u.enabled = false AND u.createdAt < :cutoffDate")
	int hardDeleteUnverifiedAccounts(@Param("cutoffDate")LocalDateTime cutoffDate);

	@Query("SELECT u.id FROM User u WHERE u.enabled = false AND u.createdAt < :cutoffDate")
	List<UUID> findUnverifiedUserIdsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);

	@Modifying
	@Query("DELETE FROM User u WHERE u.id IN :userIds")
	void deleteByIdIn(@Param("userIds") List<UUID> userIds);
}
