package com.teampulse.backend.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import jakarta.persistence.Table;
import org.hibernate.annotations.*;

import com.teampulse.backend.enums.TaskPriority;
import com.teampulse.backend.enums.TaskStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.annotation.Nullable;

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

	@NotFound(action = NotFoundAction.IGNORE)
	@Nullable
	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="assignee_id")
	private User assignee;

	@NotFound(action = NotFoundAction.IGNORE)
	@Nullable
	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="creator_id", updatable = false)
	private User creator;

	@Column(name="deleted", nullable=false)
	private boolean deleted = false;

	@Version
	@Column(name = "version", nullable = false)
	private Long version = 0L;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name="updated_at", nullable=false)
	private Instant updatedAt;
}
