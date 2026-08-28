package com.teampulse.backend.model;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.UpdateTimestamp;

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
@Table(name="task_comments")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TaskComment {
	@Id
	@GeneratedValue(strategy=GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="task_id", nullable=false)
	@NotFound(action=NotFoundAction.IGNORE)
	private Task task;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="author_id", nullable=false)
	private User author;

	@Column(name="content", nullable=false, length=2000)
	private String content;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name="updated_at", nullable=false)
	private LocalDateTime updatedAt;
}
