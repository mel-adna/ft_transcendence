package com.teampulse.backend.model;

import java.time.Instant;
import java.util.UUID;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Builder;

@Entity
@Table(name="verification_codes")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VerificationCode {
	@Id
	@GeneratedValue(strategy=GenerationType.UUID)
	UUID id;

	@Column(nullable=false)
	private String code;

	@OneToOne
	@JoinColumn(name="user_id", nullable=false)
	private User user;

	@Column(name = "expiry_date", nullable=false)
	private Instant expiryDate;

	public boolean isExpired() {
		return Instant.now().isAfter(expiryDate);
	}
}
