package com.teampulse.backend.model;

import java.time.LocalDateTime;
import java.util.UUID;


import jakarta.persistence.*;
import jakarta.persistence.Table;
import org.hibernate.annotations.*;

import com.teampulse.backend.enums.WorkspaceType;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.annotation.Nullable;

@Entity
@Table(name="workspaces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SQLDelete(sql = "UPDATE workspaces SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Workspace {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name="name", nullable=false, length=100)
    private String name;

	@Column(name="description", length=500) 
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name="type", nullable=false, length=50)
    private WorkspaceType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="owner_id")
    @NotFound(action = NotFoundAction.IGNORE)
    @Nullable
    private User owner;

    @Column(name="deleted", nullable=false)
    private boolean deleted = false;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @CreationTimestamp
    @Column(name="created_at", nullable=false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name="updated_at", nullable=false)
    private LocalDateTime updatedAt;
}
