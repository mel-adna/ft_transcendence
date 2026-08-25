package com.teampulse.backend.model;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import com.teampulse.backend.model.enums.TaskPriority;
import com.teampulse.backend.model.enums.TaskStatus;

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
@Table(name="tasks")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@SQLDelete(sql = "UPDATE tasks SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Task {
	@Id
	@GeneratedValue(strategy=GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="workspace_id", nullable=false)
	private Workspace workspace;

	@Column(name="title", nullable=false, length=150)
	private String title;

	@Column(name="description", length=40000)
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(name="status", nullable=false, length=50)
	private TaskStatus status = TaskStatus.TODO;

	@Enumerated(EnumType.STRING)
	@Column(name="priority", nullable=false, length=50)
	private TaskPriority priority = TaskPriority.MEDIUM;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="assignee_id")
	private User assignee;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="creator_id", nullable=false)
	private User creator;

	@Column(name="deleted", nullable=false)
	private boolean deleted = false;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name="updated_at", nullable=false)
	private Instant updatedAt;
}
