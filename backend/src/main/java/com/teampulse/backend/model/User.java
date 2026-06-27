package com.teampulse.backend.model;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "users")
@Getter
@Setter
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

	@Column(name="password_hash", nullable=true)
	private String passwordHashed;

	@Column(name="first_name", length=50)
	private String firstName;

	@Column(name="last_name", length=50)
	private String lastName;

	@Column(name="avatar_url")
	private String avatarUrl;

	@Column(name="deleted", nullable=false)
	private boolean deleted = false;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name="updated_at", nullable=false, updatable=true)
	private LocalDateTime updatedAt;
}
