package com.teampulse.backend.model;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name="activity_logs")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ActivityLog {
	@Id
	@GeneratedValue(strategy=GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="user_id", nullable=false)
	@NotFound(action=NotFoundAction.IGNORE)
	private User user;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="workspace_id", nullable=false)
	private Workspace workspace;

	@Column(name="action_type", nullable=false)
	private String actionType;

	@Column(name="entity_id", nullable=false)
	private UUID entityId;

	@Column(name = "description", length = 500)
    private String description;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private Instant createdAt;
}
