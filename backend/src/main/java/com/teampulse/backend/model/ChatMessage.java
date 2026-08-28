package com.teampulse.backend.model;

import java.time.LocalDateTime;
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
@Table(name="chat_messages")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
	@Id
	@GeneratedValue(strategy=GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="workspace_id", nullable=false)
	private Workspace workspace;

	@ManyToOne(fetch=FetchType.LAZY)
	@JoinColumn(name="sender_id", nullable=false)
	@NotFound(action=NotFoundAction.IGNORE)
	private User sender;

	@Column(name="sender_name", nullable=false, length=50)
	private String senderName;

	@Column(name="sender_avatar_url")
	private String senderAvatarUrl;

	@Column(name="content", nullable=false, length=2000)
	private String content;

	@CreationTimestamp
	@Column(name="created_at", nullable=false, updatable=false)
	private LocalDateTime createdAt;
}
