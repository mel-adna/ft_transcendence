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
| 17 | The hardened public API in the spec does not exist | A mandatory MVP requirement with nothing implemented behind it | Real work |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 13 | No activity log for task created or task deleted | Creating a task leaves no trace in the feed | Small |
| 15 | Two controllers register the same two operations | Duplicate endpoints in Swagger, and one documents a status it does not return | Small |
| 16 | `WorkspaceResponse` omits `description` | Editing a team silently wipes its description, and no client can prevent it | 1 line |

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

## 17. The hardened public API from the spec is not implemented

`README.md` section 2E lists this under **Core Features (MVP, Mandatory Part)**:

> **Hardened Public API**: Exposes five secure, rate-limited endpoints requiring API keys:
> `/api/tasks`, `/api/users`, `/api/organizations`, `/api/stats`, `/api/chat`

None of it exists. Searching the whole backend and the nginx config finds no rate limiting of any
kind (no bucket4j, no resilience4j, no `@RateLimiter`, no `limit_req` in nginx) and no API key
handling (no `X-API-KEY`, no api key filter, no key storage). The five paths are not registered
either; the real API lives under `/api/v1/...` with JWT authentication, which is a different
thing from a keyed public API.

This is worth raising early because it is the one gap that is mandatory rather than optional, and
it is trivially checkable by an evaluator with `curl`: hammer any endpoint in a loop and nothing
throttles.

The smallest honest implementation is an `X-API-KEY` filter in front of the five paths plus
`limit_req` zones in nginx, which is where rate limiting is cheapest to add.

---

# Not blocking

## 13. The activity trail still misses task created and task deleted

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

**Completing a task from the board is now logged.** Fixed in `a3e40f4`. `updateTaskStatus`
calls `checkAndTriggerStatusEvents(updatedTask, oldStatus, currentUser)`, so dragging a card to
Done writes `TASK_COMPLETED`. The same commit gave `triggerTaskCompletedEvent` an `actor`
parameter, which also fixes the misattribution below.

**Assigning a task to yourself logs nothing.** `TaskEventListener.handleTaskAssignedEvent`
returns before `logActivity` when assigner and assignee are the same person. Skipping the
*notification* is right, nobody wants to be emailed about their own action, but the early
return also skips the activity log and the audit trail, which are not notifications.

Measured against the running backend. Starting from 2 activity rows: create a task assigned
to yourself, move it to DOING, then to DONE.

That measurement was taken before `a3e40f4`. Completions now log, so the remaining gap is
narrower: creating a task still writes nothing, and neither does deleting one.

**Misattribution is fixed too.** `TASK_COMPLETED` used to be logged against
`task.getCreator()` rather than whoever finished the task. `a3e40f4` passes the acting user
through, so the feed now credits the right person.

What is still missing is `TASK_CREATED` and `TASK_DELETED`, and the self-assignment skip.

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

## 16. `WorkspaceResponse` does not return `description`, so editing a team erases it

`Workspace` stores a description and `WorkspaceCreateRequest` and `WorkspaceUpdateRequest` both
accept one, but `WorkspaceResponse` exposes only `id`, `name`, `type` and `owner`. The field is
write-only from a client's point of view: you can set it and never read it back.

That turns into data loss on update. `WorkspaceUpdateRequest.description` is not annotated
`@NotNull`, and MapStruct's `updateWorkspaceFromRequest` maps it straight onto the entity, so
leaving it out sets it to null. Measured on the running backend:

```
description in DB before:                            after
PUT /workspaces/{id} with only name and type
description in DB after:                             <NULL>
```

No frontend can avoid this. Preserving a value requires reading it first, and the API never
returns it. The Edit team form therefore says plainly that the field starts empty and that
whatever is left in it replaces what was stored.

**Fix:** add `private String description;` to `WorkspaceResponse`. The mapper already copies
matching field names, so nothing else needs changing. Then the form can prefill it and the data
loss disappears.

## 15. Change password and update profile are each registered twice

`AuthController` (`@RequestMapping("/auth")`) and `UserController` (`@RequestMapping("/users")`)
both declare the same two operations, so four endpoints exist where two would do:

| Endpoint | Calls | Returns |
|---|---|---|
| `POST /auth/change-password` | `userService.changePassword` | `200` with `"Password changed successfully"` |
| `POST /users/change-password` | `userService.changePassword` | `204` with no body |
| `PUT /auth/profile` | `userService.updateProfile` | `200` with `UserResponse` |
| `PUT /users/profile` | `userService.updateProfile` | `200` with `UserResponse` |

The profile pair is identical down to the response. The password pair differs only in the
status code. Both were confirmed against the running backend by changing one account's password
twice, once through each endpoint, then logging in with the final password:

```
POST /users/change-password   ->  204 No Content
POST /auth/change-password    ->  200 OK
login with the new password   ->  200 OK
```

The frontend calls the `/users/*` pair for both operations, which is the better home: changing
your own password or name while signed in is a profile operation. `/auth/*` is for the things
you do when you are not authenticated yet, which is where signup, login, refresh, and the
forgot and reset pair belong.

**Also: `/users/change-password` documents a status it does not return.** The method is
declared `ResponseEntity<String>` and annotated `@ApiResponse(responseCode = "200")`, but the
body is `return ResponseEntity.noContent().build()`, which is `204` and carries no string. The
annotation is what Swagger publishes, so the docs promise `200` and the endpoint answers `204`.
Anyone who clicks "Try it out" sees the mismatch.

Nothing is broken. The frontend ignores the response body on both calls and only checks that the
request succeeded, so `204` and `200` behave the same there. This is worth fixing because two
endpoints for one operation is the kind of thing a reader notices immediately in Swagger, and
because the two copies can drift: the password pair already has.

**Suggested fix:** delete `changePassword` and `updateProfile` from `AuthController`, and correct
the annotation on the surviving `/users/change-password` to `204`, or return `200` with the
message and keep the annotation. Either is fine as long as the code and the annotation agree.
