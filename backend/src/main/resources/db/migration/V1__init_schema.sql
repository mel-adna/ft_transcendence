-- 1. Users
CREATE TABLE users
(
    id            UUID PRIMARY KEY,
    email         VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    avatar_url    VARCHAR(255),
    provider      VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
    provider_id   VARCHAR(255),
    enabled       BOOLEAN      NOT NULL DEFAULT FALSE,
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





CREATE UNIQUE INDEX idx_users_email_active_unique ON users (email) WHERE deleted = FALSE;
CREATE INDEX idx_workspaces_owner ON workspaces (owner_id) WHERE deleted = FALSE;
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX idx_tasks_workspace_active ON tasks (workspace_id) WHERE deleted = FALSE;
