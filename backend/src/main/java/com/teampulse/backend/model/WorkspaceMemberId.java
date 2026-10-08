package com.teampulse.backend.model;

import java.io.Serializable;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class WorkspaceMemberId implements Serializable {
	@Column(name="workspace_id", nullable=false)
	private UUID workspaceId;

	@Column(name="user_id", nullable=false)
	private UUID userId;
}
