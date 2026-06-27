package com.teampulse.backend.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.teampulse.backend.model.enums.WorkspaceMemberRole;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="workspace_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceMember {
	@EmbeddedId
	private WorkspaceMemberId id = new WorkspaceMemberId();

	@ManyToOne(fetch=FetchType.LAZY)
	@MapsId("workspaceId")
	@JoinColumn(name="workspace_id")
	private Workspace workspace;

	@ManyToOne(fetch=FetchType.LAZY)
	@MapsId("userId")
	@JoinColumn(name="user_id")
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name="role", nullable=false, length=50)
	private WorkspaceMemberRole role;

	@CreationTimestamp
	@Column(name="created_at", nullable=false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name="updated_at", nullable=false)
	private LocalDateTime updatedAt;
}
