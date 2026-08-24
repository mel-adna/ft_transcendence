# Backend issues

Status verified 2026-08-24 against `origin/mdbentaleb` at `324e226`, by reading the source
and by calling the running API.

Issue numbers are stable identifiers, not priorities. They never change, so links to a
given issue stay valid. The order of this file is by priority: everything that blocks a
feature comes first.

One issue has been fixed and removed from this file: CORS now allows `http://localhost:5173`,
verified by a preflight returning 200.

## Blocking

Something does not work, or does not run, until these land.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 9 | `V1__init_schema.sql` edited after being applied | Backend will not start at all on any existing database | Config |
| 1 | JWT carries no `id` claim | Chat is completely dead, every request and socket 401s | 1 line |
| 5 | Members endpoint returns `member: null` | Colleagues cannot show real members or roles | 2 lines |
| 8 | Avatar bucket is private, images 403 | Uploaded avatars never display | Small |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 2 | Notifications are never saved | Silent data loss. Blocks building any notification UI | 1 line |
| 3 | Activity logs are never written | Silent data loss, and intermittent | Small |
| 4 | `TaskCommentController` path is doubled | Endpoint unreachable at the address anyone would expect | 1 line |
| 6 | `TaskResponse.workspaceId` is always null | Dead field in the API contract | 1 line |
| 10 | `/auth/refresh` returns 500 on a malformed token | Stack traces in the log during normal session expiry | Small |
| 11 | Refresh tokens cannot be revoked and never rotate | A leaked token grants 7 days of access that nothing can stop | Design |

Four of the ten are one-line changes.

---

# Blocking issues

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

## 1. The JWT carries no `id` claim, which blocks chat entirely

`JwtUtils.generateToken` is only ever called through the single-argument overload, so
`extraClaims` is an empty map and the token carries just `sub`, the email.

aarab's chat backend rejects any token without an `id` claim
(`SocketAuthUseCase` and `authMiddleware` both check `payload.id`), so every chat REST
call and every socket handshake fails.

Verified against a live token issued by the running backend:

```
{"sub":"verify+1@teampulse.local","iat":1785753236,"exp":1785756836}
```

**Fix:** put the user id into `extraClaims` before building the token, so it comes out
alongside `sub`. Adding the user id unblocks chat for the whole team.

Nothing on the frontend can work around this. The chat UI is fully wired and will start
working the moment this lands.

## 5. The members endpoint returns `member: null`

`GET /workspaces/{workspaceId}/members` now exists, which is the endpoint the Colleagues
page needed. It answers 200, but every entry comes back with no user attached:

```json
[{"member": null, "role": "ADMIN", "joinedAt": null}]
```

Cause: `WorkspaceMemberResponse` names the field `member`, while the `WorkspaceMember`
entity names it `user`. MapStruct maps by property name, finds no source called `member`,
and leaves it null. `joinedAt` is null for the same reason: the entity field is `createdAt`.

**Fix:** add the two mappings in `WorkspaceMapper`, above `toMemberResponse`:

```java
@Mapping(target = "member", source = "user")
@Mapping(target = "joinedAt", source = "createdAt")
WorkspaceMemberResponse toMemberResponse(WorkspaceMember member);
```

**Reproduced end to end on 2026-08-24.** A second member was added to a workspace through
the app, then the database and the endpoint were compared:

```
database:  verify+1@teampulse.local  role=ADMIN
           Jhonedoe1@mail.com        role=MEMBER

endpoint:  [{"member": null, "role": "ADMIN",  "joinedAt": null},
            {"member": null, "role": "MEMBER", "joinedAt": null}]
```

The membership rows are correct, the count is correct, the roles are correct. Only the
user object is dropped on the way out. The added member is invisible to the frontend.

Until that lands, the frontend calls the endpoint and falls back to inferring the roster
from the workspace owner plus anyone attached to a task, so the Colleagues page keeps
working. The visible symptom is exactly the one above: a member who has no tasks does not
appear. It starts showing the real list, with real ADMIN and VIEWER roles, the moment this
is fixed. No frontend change will be needed.

**It also blocks task assignment.** The task form has no assignee picker, because there is
no way to populate one: a dropdown of teammates needs exactly this endpoint. So every task
created through the app is unassigned, which is why the task board and the task detail view
show no assignee. The API itself accepts `assigneeId` and assigns correctly (verified with
curl), it is only the UI that cannot offer the choice.

That in turn keeps issue 2 invisible even after it is fixed, since `TaskEventListener` only
creates a notification when a completed task has an assignee. Fixing this one endpoint
unblocks the roster, the assignee picker, and notifications actually firing.

## 8. Uploaded avatars are not publicly readable

`POST /users/me/avatar` works: it accepts the multipart `file`, stores it in MinIO, and
returns a URL such as `http://localhost:9000/teampulse-avatars/avatar-<uuid>.png`.

Fetching that URL returns **403** with an XML error body. `FileStorageService` calls
`makeBucket` but never sets a bucket policy, so the bucket is private while the URL handed
to the browser is a plain public one.

**Fix, pick one:**
- Call `minioClient.setBucketPolicy(...)` with a public-read policy for the bucket right
  after `makeBucket`.
- Or return a presigned URL instead of a raw one.
- Or serve avatars through a backend endpoint that streams the object.

The frontend degrades gracefully in the meantime: `Avatar.jsx` falls back to the user's
initials when the image fails to load, so nothing looks broken, but no avatar ever appears.

---

# Not blocking

## 2. Notifications are never persisted

`NotificationService.java:39`

```java
Notification notification = new Notification();
notification.setId(UUID.randomUUID());   // <-- remove this line
```

`Notification.java:37` already declares `@GeneratedValue(strategy = GenerationType.UUID)`,
so Hibernate owns the id.

Spring Data's `SimpleJpaRepository.save()` chooses between `persist()` and `merge()` by
asking whether the entity is new, and the default check is whether the id is null.
Because the id was set by hand it is not null, so `save()` calls `merge()`, which tries
to update a row that does not exist.

Observed log:

```
c.t.backend.service.NotificationService : Persisting new notification in DB for user: ...
c.t.backend.event.TaskEventListener     : Failed to send notifications for completed task ID: ...
  Error: Row was updated or deleted by another transaction
         (or unsaved-value mapping was incorrect): [Notification#cd19a5b0-...]
```

The error text names the cause directly: "unsaved-value mapping was incorrect".

**Fix:** delete line 39. Nothing else changes.

**Confirming evidence:** `NotificationService` is the only service in the codebase that
assigns an id before saving, and it is the only one whose writes fail. `TaskService`,
`WorkspaceService` and `UserService` all let Hibernate generate the id and all persist
correctly.

## 3. Activity logs are never written

Re-verified 2026-08-24: still failing, and **intermittently**. The `activity_logs` table
holds one row from an earlier attempt that happened to succeed, while completing a task
today still logs the error below. An intermittent failure is worse than a consistent one,
because it occasionally looks like the feature works.

`TaskEventListener.java:48-52`, in `processActivityLogging`.

The handler is `@Async`, so it runs on a different thread from the request. By the time
it runs, the Hibernate session that loaded the `Task` has closed, so lazy associations
cannot be resolved. Line 50 calls `task.getWorkspace().getName()` and line 52 calls
`task.getWorkspace().getId()`.

Observed logs, two separate runs:

```
Failed to create ActivityLog for completed task ID: a8f9ac60-...
  Error: A problem occurred in the SQL executor : Error advancing (next) ResultSet
         position [This ResultSet is closed.]

Failed to create ActivityLog for completed task ID: 47256f23-...
  Error: JDBC exception executing SQL [select w1_0.id, ... from workspaces w1_0
         where w1_0.id=? and (w1_0.deleted = false)] [This statement has been closed.]
```

**Fix options, pick one:**

- Carry the ids in the event itself rather than the entity, so the listener never touches
  a lazy association.
- Re-read the task inside the listener's own transaction, with the workspace and creator
  fetched eagerly (a `JOIN FETCH` query).
- Annotate the handler so it runs in a new transaction and load what it needs there.

The first is usually cleanest: events should carry data, not detached entities.

## 4. `TaskCommentController` is unreachable

It is annotated `@RequestMapping("/api/v1")`, but `application.yaml` already sets
`server.servlet.context-path: /api/v1`. The two combine, so its real paths are
`/api/v1/api/v1/tasks/{taskId}/comments`.

**Fix:** change the class mapping to `/tasks` and let the context path supply the prefix,
matching every other controller.

No frontend screen calls it, so nothing is broken today, but the endpoint does not exist
at the address anyone would expect.

## 6. `TaskResponse.workspaceId` is always null

`GET /tasks/workspace/{id}` returns every task with `"workspaceId": null`, verified live.
`TaskMapper` ignores the workspace association on all three mappings, so the field is
never populated.

The frontend does not read it, so nothing is broken, but the field is currently dead
weight in the API contract.

**Fix:** map it from `task.workspace.id`, or drop the field from the DTO.


## 10. `/auth/refresh` answers 500 for a malformed token

`UserService.refreshToken` starts with `jwtUtils.extractUsername(refreshToken)`. For a token
that is not a well formed JWT, jjwt throws while parsing, before the method reaches its own
`BadRequestException("Invalid or expired refresh token!")`. The exception is not handled, so
the client gets a 500 and the log gets a full stack trace.

Verified live:

```
POST /api/v1/auth/refresh  {"refreshToken":"garbage"}   ->  500
  io.jsonwebtoken.impl.DefaultJwtParser.parseSignedClaims(...)
```

This runs on an ordinary path, not an exotic one: any user whose stored refresh token is
stale or corrupted hits it, and the project is graded partly on a clean error surface.

**Fix:** wrap the parse, or catch `JwtException` in `GlobalExceptionHandler`, and answer 401
so the client can tell "your session ended" apart from "the server broke".

The frontend already treats any refresh failure as a logout, so nothing is broken for the
user. It is the status code and the noise that are wrong.


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
- **Long window.** `refresh-expiration-ms` is 7 days and `access-expiration-ms` is 1 hour.
  A 15 minute access setting is present but commented out at `application.yaml:91`.

The frontend stores the refresh token in `localStorage`, which is readable by any script on
the origin. This is a common pattern and the app has no XSS vector today (no
`dangerouslySetInnerHTML`, no `innerHTML`, no `eval` in the codebase, and React escapes by
default), and traffic is HTTPS through nginx, so this is about XSS specifically rather than
interception. The combination above is what makes the consequences of an XSS bug severe:
the token can be exfiltrated and replayed from another machine for a week, and nobody can
stop it.

**Cheapest improvements, in order:**

1. Lower `JWT_REFRESH_EXPIRATION`. Seven days is generous for this app. One config line.
2. Uncomment the 15 minute `JWT_ACCESS_EXPIRATION` at `application.yaml:91`. One config line.
   The frontend refreshes automatically now, so a short access token costs the user nothing.
3. Rotate the refresh token on every use and persist the current one, so a replayed old token
   can be detected and rejected.
4. Move the refresh token to an httpOnly, Secure, SameSite cookie. This is the real fix, and
   it is a backend change: the frontend cannot do it alone.

Steps 1 and 2 are free and meaningfully reduce the blast radius.
