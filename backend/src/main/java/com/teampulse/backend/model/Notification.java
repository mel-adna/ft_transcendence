package com.teampulse.backend.model;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import com.teampulse.backend.enums.EntityType;
import com.teampulse.backend.enums.NotificationType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="notifications")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Notification {
	@Id
	@GeneratedValue(strategy=GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="recipient_id", nullable=false)
	@NotFound(action=NotFoundAction.IGNORE)
	private User recipient;

	@Enumerated(EnumType.STRING)
	@Column(name="type", nullable=false, length=100)
	private NotificationType type;

	@Enumerated(EnumType.STRING)
	@Column(name="entity_type", length=50)
	private EntityType entityType;

	@Column(name="entity_id")
	private UUID entityId;

	@Column(name="message", length=500, nullable=false)
	private String message;

	@Column(name="is_read", nullable=false)
	private boolean isRead = false;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private LocalDateTime createdAt;
}
