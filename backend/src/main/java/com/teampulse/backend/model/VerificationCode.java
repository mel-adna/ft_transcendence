package com.teampulse.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "verification_codes")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VerificationCode {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	UUID id;

	@Column(nullable = false, length = 6)
	private String code;

	@OneToOne
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "expiry_date", nullable = false)
	private Instant expiryDate;

	public boolean isExpired() {
		return Instant.now().isAfter(expiryDate);
	}
}
