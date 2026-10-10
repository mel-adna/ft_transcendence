CREATE
EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users
(
    id               UUID PRIMARY KEY,
    email            VARCHAR(100) NOT NULL,
    password_hash    VARCHAR(255),
    first_name       VARCHAR(50),
    last_name        VARCHAR(50),
    avatar_url       VARCHAR(255),
    provider         VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
    provider_id      VARCHAR(255),
    enabled          BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
    security_version BIGINT       NOT NULL DEFAULT 1,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspaces
(
    id          UUID PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    type        VARCHAR(50)  NOT NULL,
    owner_id    UUID,
    deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
    version     BIGINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspaces_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE workspace_members
(
    workspace_id UUID        NOT NULL,
    user_id      UUID        NOT NULL,
    role         VARCHAR(50) NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),

    CONSTRAINT fk_members_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE tasks
(
    id           UUID PRIMARY KEY,
    workspace_id UUID         NOT NULL,
    title        VARCHAR(150) NOT NULL,
    description  VARCHAR(40000),
    status       VARCHAR(50)  NOT NULL DEFAULT 'TODO',
    priority     VARCHAR(50)  NOT NULL DEFAULT 'MEDIUM',
    assignee_id  UUID,
    creator_id   UUID,
    deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    version      BIGINT       NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tasks_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE notifications
(
    id           UUID PRIMARY KEY,
    recipient_id UUID,
    type         VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    UUID,
    message      VARCHAR(500) NOT NULL,
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE activity_logs
(
    id           UUID PRIMARY KEY,
    user_id      UUID         NOT NULL,
    workspace_id UUID         NOT NULL,
    action_type  VARCHAR(255) NOT NULL,
    description  VARCHAR(500),
    entity_id    UUID,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens
(
    id          UUID PRIMARY KEY,
    token       VARCHAR(255) NOT NULL,
    user_id     UUID         NOT NULL,
    expiry_date TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_password_reset_token UNIQUE (token),
    CONSTRAINT uk_password_reset_user UNIQUE (user_id),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens
(
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expiry_date TIMESTAMP   NOT NULL,
    client_ip   VARCHAR(45),
    user_agent  VARCHAR(512),
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    consumed    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE verification_codes
(
    id          UUID PRIMARY KEY,
    code        VARCHAR(64) NOT NULL,
    user_id     UUID        NOT NULL,
    expiry_date TIMESTAMP   NOT NULL,
    enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_verification_codes_user UNIQUE (user_id),
    CONSTRAINT fk_verification_codes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE api_keys
(
    id           UUID PRIMARY KEY,
    hash_key     VARCHAR(64)  NOT NULL UNIQUE,
    key_prefix   varchar(100) NOT NULL,
    user_id      UUID         NOT NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_api_key_user UNIQUE (user_id),
    CONSTRAINT fk_api_key_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE workspace_invitation
(
    id                UUID PRIMARY KEY,
    workspace_id      UUID         NOT NULL,
    invitee_email     VARCHAR(100) NOT NULL,
    inviter_id        UUID,
    invitation_status VARCHAR(50)  NOT NULL,
    role              VARCHAR(50)  NOT NULL,
    version           BIGINT       NOT NULL DEFAULT 0,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at        TIMESTAMP    NOT NULL,

    CONSTRAINT fk_workspace_invitation_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
    CONSTRAINT fk_workspace_invitation_user FOREIGN KEY (inviter_id) REFERENCES users (id)
);


CREATE UNIQUE INDEX idx_users_email_active_unique ON users (email) WHERE deleted = FALSE;
CREATE INDEX idx_workspaces_owner ON workspaces (owner_id) WHERE deleted = FALSE;
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX idx_tasks_workspace_active ON tasks (workspace_id) WHERE deleted = FALSE;
CREATE INDEX idx_tasks_assignee_active ON tasks (assignee_id) WHERE deleted = FALSE AND assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_workspace ON tasks (workspace_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_logs_workspace_timestamp ON activity_logs (workspace_id, created_at DESC);
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (recipient_id) WHERE is_read = FALSE;
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens (token);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE INDEX idx_verification_codes_code ON verification_codes (code);
CREATE INDEX idx_verification_codes_user ON verification_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_workspace_status ON workspace_invitation (workspace_id, invitation_status);
CREATE INDEX IF NOT EXISTS idx_invitation_invitee_status ON workspace_invitation (invitee_email, invitation_status);
CREATE INDEX IF NOT EXISTS idx_invitation_inviter ON workspace_invitation (inviter_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner_name_active ON workspaces(owner_id, lower (name)) WHERE deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_workspace_invitation ON workspace_invitation(workspace_id, lower (invitee_email)) WHERE invitation_status = 'PENDING';
