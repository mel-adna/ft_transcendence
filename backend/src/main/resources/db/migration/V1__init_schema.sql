-- 1. Users
CREATE TABLE users
(
    id            UUID PRIMARY KEY,
    email         VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    avatar_url    VARCHAR(255),
    provider      VARCHAR(20)  NOT NULL DEFAULT 'LOCAL', -- Enum: LOCAL, GOOGLE
    provider_id   VARCHAR(255),
    deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workspaces
CREATE TABLE workspaces
(
    id          UUID PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    type        VARCHAR(50)  NOT NULL, -- Enum: PERSONAL, ORGANIZATION
    owner_id    UUID         NOT NULL,
    deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspaces_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- 3. Workspace Members junction table
CREATE TABLE workspace_members
(
    workspace_id UUID        NOT NULL,
    user_id      UUID        NOT NULL,
    role         VARCHAR(50) NOT NULL, -- Enum: ADMIN, MEMBER, VIEWER
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT fk_members_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- 4. Tasks
CREATE TABLE tasks
(
    id           UUID PRIMARY KEY,
    workspace_id UUID         NOT NULL,
    title        VARCHAR(150) NOT NULL,
    description  VARCHAR(40000),
    status       VARCHAR(50)  NOT NULL DEFAULT 'TODO',   -- Enum: TODO, DOING, DONE
    priority     VARCHAR(50)  NOT NULL DEFAULT 'MEDIUM', -- Enum: LOW, MEDIUM, HIGH
    assignee_id  UUID,
    creator_id   UUID         NOT NULL,
    deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- 5. Task Comments Table
CREATE TABLE task_comments
(
    id         UUID PRIMARY KEY,
    task_id    UUID          NOT NULL,
    author_id  UUID          NOT NULL,
    content    VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- 6. Chat Messages
CREATE TABLE chat_messages
(
    id                UUID PRIMARY KEY,
    workspace_id      UUID          NOT NULL,
    sender_id         UUID          NOT NULL,
    sender_name       VARCHAR(50)   NOT NULL,
    sender_avatar_url VARCHAR(255),
    content           VARCHAR(2000) NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- 7, Notifications
CREATE TABLE notifications
(
    id           UUID PRIMARY KEY,
    recipient_id UUID         NOT NULL,
    type         VARCHAR(100) NOT NULL, -- ex: TASK_ASSIGNED, TASK_COMMENTED, WORKSPACE_MEMBER_ADDED
    entity_type  VARCHAR(50),           -- ex: TASK, WORKSPACE, TASK_COMMENT
    entity_id    UUID,                  -- ID of the related entity (task, workspace, etc.)
    message      VARCHAR(500) NOT NULL,
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 8. Activity Log
CREATE TABLE activity_logs
(
    id           UUID PRIMARY KEY,
    user_id      UUID         NOT NULL,
    workspace_id UUID         NOT NULL,
    action_type  VARCHAR(255) NOT NULL, -- Ex:  'TASK_COMPLETED'
    description  VARCHAR(500),
    entity_id    UUID,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

-- 9. Password Reset Tokens
CREATE TABLE password_reset_tokens
(
    id          UUID PRIMARY KEY,
    token       VARCHAR(255) NOT NULL,
    user_id     UUID         NOT NULL,
    expiry_date TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_password_reset_token UNIQUE (token),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 10. Refresh Tokens
CREATE TABLE refresh_tokens
(
    id          UUID PRIMARY KEY,
    user_id     UUID      NOT NULL,
    token       TEXT      NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    revoked     BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


CREATE UNIQUE INDEX idx_users_email_active_unique ON users (email) WHERE deleted = FALSE;
CREATE INDEX idx_workspaces_owner ON workspaces (owner_id) WHERE deleted = FALSE;
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX idx_tasks_workspace_active ON tasks (workspace_id) WHERE deleted = FALSE;
CREATE INDEX idx_tasks_assignee_active ON tasks (assignee_id) WHERE deleted = FALSE AND assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_workspace ON tasks (workspace_id);
CREATE INDEX idx_task_comments_task_created ON task_comments (task_id, created_at DESC);
CREATE INDEX idx_chat_workspace_created ON chat_messages (workspace_id, created_at DESC);
CREATE INDEX idx_logs_workspace_timestamp ON activity_logs (workspace_id, created_at DESC);
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (recipient_id) WHERE is_read = FALSE;
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens (token);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);