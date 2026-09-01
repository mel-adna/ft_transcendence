# Backend issues

Status verified 2026-08-30 against `origin/mdbentaleb` at `27d6610`, by reading the merged
source. Everything already fixed has been removed, so the numbering has gaps. What is left
is what still needs doing.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a
given issue stays valid. The order of this file is by priority: everything that blocks a
feature comes first.

## Blocking

Something does not work until this lands.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 12 | Live secrets committed to a public repo | JWT signing key, DB and Grafana passwords, Google client secret are public | Urgent |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 13 | Activity trail misses task created, completed and self-assigned | A user working their own board produces an empty activity feed | Small |
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
