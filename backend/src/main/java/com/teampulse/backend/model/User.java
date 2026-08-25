package com.teampulse.backend.model;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import com.teampulse.backend.model.enums.AuthProvider;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@SQLDelete(sql = "UPDATE users SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name="email", nullable=false, length=100)
	private String email;

	@Column(name="password_hash")
	private String passwordHashed;

	@Column(name="first_name", length=50)
	private String firstName;

	@Column(name="last_name", length=50)
	private String lastName;

	@Column(name="avatar_url")
	private String avatarUrl;

	@Builder.Default
	@Enumerated(EnumType.STRING)
	@Column(name="provider", nullable=false, length=20)
	private AuthProvider provider = AuthProvider.LOCAL;

	@Column(name="provider_id")
	private String providerId;

	@Builder.Default
	@Column(name="deleted", nullable=false)
	private boolean deleted = false;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name="updated_at", nullable=false, updatable=true)
	private LocalDateTime updatedAt;
}
