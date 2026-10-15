# Backend issues

Status checked 2026-10-15 against `56bf84b` on `main`. Only unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

Numbers 42 to 44 were used by mdbentaleb's old `backend/frontend-issues.md`, so backend issues here
start at 45.

## Blocking

Both stop the app on a fresh clone, which is how an evaluator usually starts. `make` stops at 54
first, and 53 only shows once 54 is fixed.

| # | Issue | Why it matters | Effort | Who fixes it |
|---|---|---|---|---|
| 54 | `make` stops at its first step: the Makefile still looks for `.env.example` | On a fresh clone, and after `make re`, `make` stops before it builds or starts anything | Five names in the `Makefile` | mdbentaleb |
| 53 | A fresh clone does not start: the example JWT secret is not base64 | Once 54 is fixed, `make` on a fresh clone gives a backend that stops at startup, so nothing works | A few lines in the `Makefile` | mdbentaleb |

Until both are fixed, do not run `make re` or `make fclean` on a setup that works: they delete
`.env` and `secrets/`, and `make` cannot bring them back.

---

# Blocking

## 54. `make` stops at its first step: the Makefile still looks for `.env.example`

On 2026-10-14 the root `.env.example` was renamed to `.env.example`, the name the subject uses
(`3a3b16b`). That rename was the first step of this issue's fix, but the `Makefile` was not
changed with it. When `.env` is missing, its `env` rule still copies `.env.example`, which no
longer exists:

```text
Error: .env.example not found!
make: *** [env] Error 1
```

`all` runs `env` first, so `make` stops before it builds or starts anything. That happens on every
fresh clone, and also after `make re` on any setup, because `fclean` deletes `.env`. Setups that
still have their `.env` do not see it. Checked on 2026-10-15 by running `make env` on a fresh copy
of `main`.

**Fix (mdbentaleb):** in the `Makefile`, replace every `.env.example` with `.env.example`. There
are five: one in the `ENV_FILE` line and four in the `env` rule. The `!.env.example` line in
`.gitignore` no longer does anything and can go.

## 53. A fresh clone does not start: the example JWT secret is not base64

On 2026-10-14 the `secrets_example` files were changed to placeholders that start with `put_`.
The `secrets` rule in the `Makefile` copies an example into `secrets/` only when that file is
missing. Every existing setup keeps its real files and works. A fresh clone gets the placeholders,
and so does `make re`, because `fclean` deletes `secrets/`. The backend then reads the placeholder
as its JWT secret. `JwtUtils.validateAndInitKey()` decodes the secret as base64 at startup, and
the underscores are not base64:

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
