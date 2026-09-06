# Backend issues

Status verified 2026-08-30 against `origin/mdbentaleb` at `27d6610`, by reading the merged
source. Everything already fixed has been removed, so the numbering has gaps. What is left
is what still needs doing.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a
given issue stays valid. The order of this file is by priority: everything that blocks a
feature comes first.

## Blocking

A mandatory requirement with nothing behind it.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 17 | The hardened public API in the spec does not exist | A mandatory MVP requirement with nothing implemented behind it | Real work |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 13 | No activity log for task created or task deleted | Creating a task leaves no trace in the feed | Small |
| 16 | `WorkspaceResponse` omits `description` | Editing a team silently wipes its description, and no client can prevent it | 1 line |
| 18 | `POST /workspaces` returns 500 on a long description | A description over 500 characters crashes team creation instead of being rejected | 1 line |

---

# Blocking issues

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

## 18. `POST /workspaces` returns 500 for a description over 500 characters

`WorkspaceUpdateRequest.description` is annotated `@Size(max=500)`. `WorkspaceCreateRequest.description`
is not annotated at all. The column is `varchar(500)`. So the create path lets an oversized value
through bean validation and Postgres rejects it at insert time.

Measured on the running backend, same payload, same field, two endpoints:

```
POST /workspaces   description = 500 chars  ->  201 Created
POST /workspaces   description = 501 chars  ->  500 Internal Server Error
PUT  /workspaces/{id}  description = 501 chars  ->  400 Bad Request
                       {"description":"Workspace description must not exceed 500 characters"}
```

The 500 body is the generic `An unexpected server error occurred. Please try again later.`, so the
user is told nothing about which field was wrong. The backend log shows the real cause:

```
PSQLException: ERROR: value too long for type character varying(500)
DataIntegrityViolationException: could not execute batch [insert into workspaces ...]
```

Reproduced from the Create Team screen by pasting a long paragraph into Description.

**Fix:** copy the annotation that `WorkspaceUpdateRequest` already has onto
`WorkspaceCreateRequest.description`:

```java
@Size(max=500, message="Workspace description must not exceed 500 characters")
private String description;
```

The frontend now caps the field at 500 characters, so this is no longer reachable from the Create
Team screen. It stays reachable from Swagger and from any other client.

### The wider point

`GlobalExceptionHandler` has handlers for `MethodArgumentNotValidException`, `BadRequestException`,
`ResourceNotFoundException`, `UnauthorizedAccessException`, `ResourceAlreadyExistsException`,
`ExpiredJwtException`, `JwtException` and `BadCredentialsException`, then a catch-all
`@ExceptionHandler(Exception.class)` that returns 500. There is no handler for
`DataIntegrityViolationException`.

So any constraint the database enforces but bean validation does not, length, a not-null column, a
foreign key, surfaces as a 500 rather than a 4xx. Duplicates are the exception: the service layer
checks those itself and throws `ResourceAlreadyExistsException`, which is handled. The missing `@Size` is one instance of
that. Adding a `DataIntegrityViolationException` handler that returns 409 or 400 would stop the
whole class of them from being reported as server crashes.
