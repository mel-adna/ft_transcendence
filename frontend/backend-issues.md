# Backend issues

Status re-verified on 2026-08-24 against `origin/mdbentaleb` at `324e226`, his latest,
by reading the source and by calling the running API. Issues 5, 8 and 9 were found after
his last push, so he has not seen them yet.

| # | Issue | Status | Effort |
|---|---|---|---|
| 1 | JWT carries no `id` claim | OPEN. Live token still `{sub, iat, exp}` | 1 line |
| 2 | Notifications never saved | OPEN. 0 rows, same error reproduced | 1 line |
| 3 | Activity logs never written | OPEN, and intermittent. Errors continue | Small |
| 4 | `TaskCommentController` path doubled | OPEN. Still `@RequestMapping("/api/v1")` | 1 line |
| 5 | Members endpoint returns `member: null` | OPEN, not yet reported to him | 2 lines |
| 6 | `TaskResponse.workspaceId` always null | OPEN. Still null on every task | 1 line |
| 7 | CORS rejects the dev frontend origin | **FIXED.** Preflight from `:5173` now 200 | done |
| 8 | Avatar bucket private, images 403 | OPEN, not yet reported to him | Small |
| 9 | `V1__init_schema.sql` edited after apply | OPEN in the repo. Repaired on this machine | Config |

One of nine fixed. Issues 5, 8 and 9 were introduced by his most recent commits and are
new findings, so the fair count of things he knew about and has not done is five.

---|---|---|---|
| 1 | JWT carries no `id` claim | Chat is completely blocked | 1 line |
| 2 | Notifications never saved | Notification API always returns 0 | 1 line |
| 3 | Activity logs never written | `activity_logs` table stays empty | Small |
| 4 | `TaskCommentController` path doubled | Endpoint unreachable | 1 line |
| 5 | `GET /workspaces/{id}/members` returns `member: null` | Endpoint exists but is unusable | 2 lines |
| 6 | `TaskResponse.workspaceId` always null | Field is dead weight | 1 line |
| 7 | ~~CORS rejects the dev frontend origin~~ | FIXED, `localhost:5173` added | done |
| 8 | Avatar bucket is private, uploaded images 403 | Avatars never display | Small |
| 9 | `V1__init_schema.sql` edited after being applied | Backend will not boot on an existing DB | Config |

---


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

Until that lands, the frontend calls the endpoint and falls back to inferring the roster
from tasks whenever the response has no usable members, so the Colleagues page keeps
working either way and starts showing real roles automatically once this is fixed.

## 6. `TaskResponse.workspaceId` is always null

`GET /tasks/workspace/{id}` returns every task with `"workspaceId": null`, verified live.
`TaskMapper` ignores the workspace association on all three mappings, so the field is
never populated.

The frontend does not read it, so nothing is broken, but the field is currently dead
weight in the API contract.

**Fix:** map it from `task.workspace.id`, or drop the field from the DTO.

## 7. CORS rejects the development frontend (FIXED 2026-08-24)

`SecurityConfig.corsConfigurationSource()` allows `app.frontend-url` (which defaults to
`http://localhost:8080`), plus `http://localhost:3000`, `http://localhost:5000` and a
production domain. `WebConfig.addCorsMappings` separately hardcodes 3000 and 5000.

Vite's dev server runs on `http://localhost:5173`, which appears in neither list, so
every browser request failed the preflight with `403 Invalid CORS request`. The confusing
part is that `curl` worked the whole time, because CORS is enforced by browsers and not
by the server refusing to answer.

Worked around on the frontend for now: `vite.config.js` proxies `/api/v1` to port 8080
and strips the `Origin` header, so the browser stays same origin and CORS never applies.
No backend change is strictly required.

**Fixed.** `SecurityConfig` now allows `http://localhost:5173`, `http://localhost` and
`https://localhost`. Verified: a preflight from `:5173` straight to `:8080` returns 200.
The Vite proxy is therefore no longer required, though it is kept because a relative base
URL is also what production needs behind nginx.

**Still worth tidying:** there are two CORS configurations, `WebConfig.addCorsMappings` and
the `CorsConfigurationSource` bean, and only the bean applies inside the security filter
chain. Having both invites confusion later.

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
