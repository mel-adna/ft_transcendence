package com.teampulse.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RefreshToken {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(columnDefinition = "TEXT", nullable = false, unique = true)
	private String token;

	@Column(name = "expiry_date", nullable = false)
	private Instant expiryDate;

	@Builder.Default
	@Column(nullable = false)
	private boolean revoked = false;

	@Builder.Default
	@CreationTimestamp
	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();
}
