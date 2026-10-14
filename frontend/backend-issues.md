# Backend issues

Status checked 2026-10-14 against `62da2e7` on `main`. Only unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

Numbers 42 to 44 were used by mdbentaleb's old `backend/frontend-issues.md`, so backend issues here
start at 45.

## Blocking

This one stops the app on a fresh clone, which is how an evaluator usually starts.

| # | Issue | Why it matters | Effort | Who fixes it |
|---|---|---|---|---|
| 53 | A fresh clone does not start: the example JWT secret is not base64 | `make` on a fresh clone gives a backend that stops at startup, so nothing works | A few lines in the `Makefile` | mdbentaleb |

## Not blocking

Real defects, but neither breaks the app at the evaluation.

| # | Issue | Why it matters | Effort | Who fixes it |
|---|---|---|---|---|
| 54 | The example env file is named `.env_example` | The subject asks for an `.env.example` file by that name | Rename and 3 lines | mdbentaleb |
| 55 | A socket refused by chat-service is never retried | After a refused reconnect, live updates stop until a reload | 2 lines | aarab |

---

# Blocking

## 53. A fresh clone does not start: the example JWT secret is not base64

On 2026-10-14 the `secrets_example` files were changed to placeholders that start with `put_`.
The `secrets` rule in the `Makefile` copies an example into `secrets/` only when that file is
missing. Every existing setup keeps its real files and works. A fresh clone gets the placeholders,
and the backend reads the placeholder as its JWT secret. `JwtUtils.validateAndInitKey()` decodes
the secret as base64 at startup, and the underscores are not base64:

```text
DecodingException: Illegal base64 character: '_'
```

So the backend stops before it answers a single request. Checked on 2026-10-14 by running the same
jjwt 0.12.6 decode on the placeholder. The real secret in a working `secrets/` passes (384 bits).

**Fix (mdbentaleb):** when a file is missing, let the `secrets` rule generate the five internal
values instead of copying a placeholder:

- `jwt_secret.txt`: `openssl rand -base64 48 | tr -d '\n'`
- `db_password.txt`, `redis_password.txt`, `minio_root_password.txt` and
  `grafana_admin_password.txt`: `openssl rand -hex 16`

Keep the copied placeholders only for `mail_password.txt` and `google_client_secret.txt`, which
belong to real Google accounts and have to be filled in by hand. Two things to know after the fix:

- The Grafana admin password is then whatever was generated, so read it from
  `secrets/grafana_admin_password.txt` for the monitoring demo.
- A generated database password only matches an empty Postgres volume. `make fclean` removes the
  volume and `secrets/` together, so that stays consistent.

Until the real mail password is in `secrets/mail_password.txt`, sign-up codes cannot be emailed,
so nobody can finish signing up on a fresh clone. The README's Instructions should say which two
files to fill in before `make`.

# Not blocking

## 54. The example env file is named `.env_example`

The subject says: "provide an .env.example file". The root file is `.env_example`, with an
underscore. `frontend/.env.example` already uses the right name.

**Fix (mdbentaleb):** run `git mv .env_example .env.example`, then change `.env_example` to
`.env.example` in the `Makefile` (the `ENV_FILE` line and the `env` rule) and in the
`!.env_example` line of `.gitignore`.

## 55. A socket refused by chat-service is never retried

Found while reviewing pull request 1, which was merged on 2026-10-14 without this part. Outages
are handled now: a 100 second chat-service outage recovers by itself. A refusal is different. When
chat-service refuses a reconnect, for example with `AUTH_TOKEN_EXPIRED` after a laptop sleeps longer
than the 15 minute token, socket.io destroys the socket and nothing reconnects it. The next
`socketClient.connect()` from a page then creates a second socket, so `WorkspaceProvider` and the
bell keep listening to the first, dead one. Reproduced in Chromium: the first socket's listener
received 0 events.

**Fix (aarab):** two changes in `frontend/src/infrastructure/socket/SocketClient.js`, both tested
with the same harness:

1. In `connect()`, replace the `this._socket.disconnect(); this._socket = null;` block with
   `this._socket.connect(); return this._socket;`, so a refused socket is revived instead of
   replaced.
2. Make `updateToken()` revive a refused socket:
   `if (this._socket && !this._socket.active) this._socket.connect();`. `lib/api.js` calls it
   after every token refresh, so the socket comes back as soon as the app has a fresh token.

With both, a 15 second and a 100 second outage still recover, and a refused socket comes back on
the same instance with all its listeners.
