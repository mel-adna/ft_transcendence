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
