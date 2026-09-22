package com.teampulse.backend.repository;

import com.teampulse.backend.model.ApiKey;
import com.teampulse.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
	@Query("SELECT a FROM ApiKey a JOIN FETCH a.user WHERE a.hashKey = :hashKey AND a.active = true")
	Optional<ApiKey> findByHashKeyAndActiveTrue(@Param("hashKey") String hashKey);
	Optional<ApiKey> findByUser(User user);
	void deleteByUser(User user);
}
