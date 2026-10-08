package com.teampulse.backend.model;

import com.teampulse.backend.enums.InvitationStatus;
import com.teampulse.backend.enums.WorkspaceMemberRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import javax.annotation.Nullable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workspace_invitation")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class WorkspaceInvitation {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "workspace_id", nullable = false)
	private Workspace workspace;

	@Column(name = "invitee_email", nullable = false, length = 100)
	private String inviteeEmail;

	@NotFound(action = NotFoundAction.IGNORE)
	@Nullable
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "inviter_id")
	private User inviter;

	@Enumerated(EnumType.STRING)
	@Column(name = "invitation_status", nullable = false, length = 50)
	private InvitationStatus status;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 50)
	private WorkspaceMemberRole role;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;
}
