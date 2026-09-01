# Backend issues

Status verified 2026-08-30 against `origin/mdbentaleb` at `27d6610`, by reading the merged
source. Seven of the ten issues in the previous version of this file are fixed and have been
removed. Two new ones are added.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a
given issue stays valid. The order of this file is by priority: everything that blocks a
feature comes first.

## Blocking

Something does not work, or does not run, until these land.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 12 | Live secrets committed to a public repo | JWT signing key, DB and Grafana passwords, Google client secret are public | Urgent |
| 9 | `V1__init_schema.sql` edited again, this time adding columns | Backend will not start on any existing database, and the new columns never get created | Config |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 13 | Activity trail misses task created, completed and self-assigned | A user working their own board produces an empty activity feed | Small |
| 14 | `Instant` timestamps broke two frontend date helpers | Wrong day on the chart, wrong time on task details | Done here |
| 11 | Refresh tokens cannot be revoked and never rotate | A leaked token grants 7 days of access that nothing can stop | Design |

---

# Blocking issues

## 12. Live secrets are committed to a public repository

`.gitignore` was changed to stop ignoring `.env`, and two env files were then committed:

```
.gitignore        the five .env lines are now commented out
backend/.gitignore  the .env line was deleted
.env              committed, 29 lines
backend/.env      committed, 20 lines
```

Between them they contain the real `JWT_SECRET`, the database password, the Grafana admin
password, and the Google OAuth client secret. The repository is public, so anyone can read
them. The JWT secret is the serious one: with it, anybody can mint a valid token for any
account and the backend will accept it, because a signature check is the only thing standing
between a request and a user's data.

There is a second copy of the same problem that predates the `.env` commits.
`application.yaml:95` hardcodes a real JWT secret as the default value:

```yaml
secret: ${JWT_SECRET:fe22c88271a103b33bdbe9cfc3d1e714c75850c44e1603463179ecac81eb0564}
```

That default is what runs whenever `JWT_SECRET` is not set, which includes the `backend`
service in `docker-compose.yml`. So the tokens the app issues today are signed with a key
that is published in the repository. The default needs to be removed so the app fails loudly
on a missing secret rather than quietly using a public one.

Deleting the files in a new commit is not enough. Git keeps every earlier version, so the
secrets stay readable in the history at `f0066cd` and `27d6610`.

**What needs to happen, in order:**

1. Rotate every value in both files: new `JWT_SECRET`, new database password, new Grafana
   password, and revoke the Google client secret in the Google Cloud console and issue a new
   one. Rotating is what actually ends the exposure. Everything else is cleanup.
2. Restore the `.gitignore` entries and `git rm --cached .env backend/.env`.
3. Keep `.env.example` with empty values as the checked-in template.
4. Optionally scrub the history with `git filter-repo`, after step 1. This rewrites commits
   that teammates already have, so it needs a heads-up first.

Rotating the JWT secret logs everyone out, which is expected and harmless.

## 9. Editing `V1__init_schema.sql` breaks existing databases

The comments in `V1__init_schema.sql` were reworded (for example `-- PERSONAL, ORGANIZATION`
became `-- Enum: PERSONAL, ORGANIZATION`). Flyway checksums the whole file, comments included,
so any database that already ran V1 now refuses to start:

```
Migration checksum mismatch for migration version 1
-> Applied to database : -662914434
-> Resolved locally    : 626826728
```

The schema itself is unchanged, so this is safe to repair rather than rebuild. Recovery
used on a local database:

```bash
docker exec teampulse-postgres psql -U med -d teampulsedb \
  -c "UPDATE flyway_schema_history SET checksum = 626826728 WHERE version = '1';"
```

**Going forward:** treat an applied migration file as immutable, comments included. Anything
that needs to change belongs in a new `V2__...sql`. Everyone on the team who already has a
database will hit this, so it is worth a message rather than letting each person debug it.

### What changed this round, and why it is now worse

The second edit to `V1__init_schema.sql` is not a comment change. It adds two columns:

```sql
provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',    -- Enum: LOCAL, GOOGLE
provider_id VARCHAR(255),
```

That creates two separate problems on any database that already ran V1:

1. **Flyway refuses to start**, same checksum mismatch as before.
2. **Repairing the checksum is no longer enough.** Flyway records V1 as applied, so it will
   never run the file again, so `provider` and `provider_id` are never created. The `User`
   entity maps `provider` as non-null, so Hibernate's schema validation then fails on a
   missing column, and if validation is off the first insert fails instead.

The fix is a new migration, which is also the only thing that works for teammates who
already have data:

```sql
-- V2__add_auth_provider.sql
ALTER TABLE users ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN provider_id VARCHAR(255);
```

Then revert `V1__init_schema.sql` to its applied contents so its checksum matches again.

### Separately: `baseline-version` is back to 1

`application.yaml` has `baseline-on-migrate: true` with `baseline-version: 1`. On a database
that is not empty but has no `flyway_schema_history`, Flyway baselines at version 1, which
marks V1 as already applied and skips it. The tables in V1 are then never created, and the
app fails with `Schema-validation: missing table [activity_logs]`. Setting
`baseline-version: 0` makes V1 run as it should.

---

# Not blocking

## 13. The activity trail misses the two most common actions, and misattributes the rest

`GET /activity-logs/workspace/{id}` works and the frontend now reads it. The gap is in what
gets written. Grepping every `logActivity` call site gives the complete set of action types
the API can ever return:

| Action type | Written by |
|---|---|
| `TASK_ASSIGNED` / `TASK_UPDATED` | `TaskEventListener.onTaskAssigned` |
| `TASK_COMPLETED` | `TaskEventListener` |
| `TASK_COMMENT_CREATED` / `_UPDATED` / `_DELETED` | `TaskCommentService` |
| `WORKSPACE_MEMBER_ADDED` | `WorkspaceEventListener` |

`TASK_CREATED` and `TASK_DELETED` are missing. `NotificationType` already declares
`TASK_DELETED`, so the enum expects it.

Two further gaps make this worse than a missing row here and there.

**Completing a task from the board logs nothing.** The completion trigger is commented out in
the only status endpoint the frontend calls:

```java
// TaskService.updateTaskStatus
//		if (updatedTask.getStatus() == TaskStatus.DONE && oldStatus != TaskStatus.DONE) {
//			triggerTaskCompletedEvent(updatedTask);
//		}
```

The live `PUT /tasks/{id}` path does still have it, but the frontend always resends the task's
current status on edit, so `oldStatus != DONE` is never true there. Dragging a card to Done
therefore never writes `TASK_COMPLETED`.

**Assigning a task to yourself logs nothing.** `TaskEventListener.handleTaskAssignedEvent`
returns before `logActivity` when assigner and assignee are the same person. Skipping the
*notification* is right, nobody wants to be emailed about their own action, but the early
return also skips the activity log and the audit trail, which are not notifications.

Measured against the running backend. Starting from 2 activity rows: create a task assigned
to yourself, move it to DOING, then to DONE.

```
activity rows BEFORE: 2
created self-assigned task 180557e5-7b4f-40a6-816f-02f38cd9f6fd
dragged TODO -> DOING -> DONE
activity rows AFTER:  2
```

Zero rows for the single most common workflow in the product. A user working their own board
sees an empty activity feed no matter how much they get done.

**The rows that do get written name the wrong person.** `TASK_COMPLETED` is logged with
`task.getCreator().getId()` as the actor, not whoever completed it, so the feed credits the
creator for someone else's work.

`TaskService.createTask` and `deleteTask` already have everything the call needs. Two calls
in the shape of the ones that are already there:

```java
activityLogService.logActivity(workspaceId, creator.getId(), savedTask.getId(),
        "TASK_CREATED", "Created the task: " + savedTask.getTitle());
```

The frontend does not need a change to display new action types. `activityLog.js` humanizes
any unknown one, so `TASK_CREATED` renders as "Task created" the moment the backend starts
sending it, and gets its proper label once it is added to the map.

It does need a workaround for the emptiness, and has one: when the API trail comes back empty
the dashboard falls back to deriving recent activity from the task list, which is what the
panel did before it was wired to this endpoint. That keeps the panel useful, but it is a
patch over the gap, not a fix. Once the three cases above are logged, the fallback stops
being reached on its own.

### Smaller point: the descriptions are written for one reader

A real row from the running API:

```
"Said Test reassigned task 'Verify assignee default' to you."
```

`description` is the same string for everyone, but "to you" only makes sense to the assignee.
In a workspace-wide feed every other member reads a sentence addressed to somebody else.
Naming the person ("... to Jhone Doe") makes the same string correct for every reader. The
notification body can stay second person, since that one really does have a single reader.

## 14. Switching the date fields to `Instant` changed the wire format

This one is already fixed on the frontend and needs nothing from the backend. It is recorded
because the cause is worth knowing before the next type change.

`Task.createdAt` / `updatedAt` and the activity log timestamps are now `java.time.Instant`
rather than `LocalDateTime`. Jackson serializes an `Instant` with a `Z`:

```
before   2026-08-24T09:16:00.044954
after    2026-08-24T09:16:00.044954Z
```

That is the correct choice, an absolute instant is better than a naive local one. But it is a
breaking change to the API contract, and it silently broke two things on the frontend that
had been written against the old format:

- `lib/stats.js` bucketed completions by the first 10 characters of the string, which is now
  the **UTC** date, while the chart's day columns are built from the browser's **local**
  calendar. In UTC+1 a task completed after local midnight was counted on the previous day or
  dropped from the chart entirely.
- `features/tasks/taskFormat.js` trimmed the string to 19 characters before parsing, which
  removed the `Z` and made the browser read the value as local time. Every task date in the
  detail modal was displayed shifted by the UTC offset.

Both now parse the value as a real instant. There are regression tests for both, and they
were checked by running them against the old code to confirm they fail there.

Nothing is asked of the backend here. The point for next time: a type change like this is a
contract change even when no field name moves, so it is worth a message to whoever consumes
the API.

## 11. Refresh tokens cannot be revoked, and never rotate

This is a design weakness rather than a defect. Nothing is broken, but it is the security
question most likely to be asked about the auth flow, so it is written down.

Refresh tokens are stateless JWTs. There is no `refresh_tokens` table and no store of any
kind: `UserService.refreshToken` validates the signature and the expiry and nothing else.
Three consequences follow.

- **No revocation.** Once issued, a refresh token is valid for its full 7 days. Logging out
  only clears the browser's copy. Changing the password does not help either, because
  validation checks the signature, the expiry, and the username, none of which change.
- **No rotation.** `refreshToken()` returns the same refresh token it was given, so a single
  stolen token keeps minting access tokens for the whole window.
- **Long window.** `refresh-expiration-ms` is 7 days. `access-expiration-ms` defaults to
  1 hour in `application.yaml:97`. The committed `.env` overrides it to 15 minutes, but the
  `backend` service in `docker-compose.yml` does not pass `JWT_ACCESS_EXPIRATION`, so the
  container still runs on the 1 hour default. Either set the default to 900000 or add the
  variable to the compose service.

The frontend stores the refresh token in `localStorage`, which is readable by any script on
the origin. This is a common pattern and the app has no XSS vector today (no
`dangerouslySetInnerHTML`, no `innerHTML`, no `eval` in the codebase, and React escapes by
default), and traffic is HTTPS through nginx, so this is about XSS specifically rather than
interception. The combination above is what makes the consequences of an XSS bug severe:
the token can be exfiltrated and replayed from another machine for a week, and nobody can
stop it.

**Cheapest improvements, in order:**

1. Lower `JWT_REFRESH_EXPIRATION`. Seven days is generous for this app. One config line.
2. Make the 15 minute access token actually apply in Docker, either by changing the default
   at `application.yaml:97` or by adding `JWT_ACCESS_EXPIRATION` to the `backend` service in
   `docker-compose.yml`. The frontend refreshes automatically now, so a short access token
   costs the user nothing.
3. Rotate the refresh token on every use and persist the current one, so a replayed old token
   can be detected and rejected.
4. Move the refresh token to an httpOnly, Secure, SameSite cookie. This is the real fix, and
   it is a backend change: the frontend cannot do it alone.

Steps 1 and 2 are free and meaningfully reduce the blast radius.
