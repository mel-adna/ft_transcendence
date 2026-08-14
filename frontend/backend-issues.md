# Backend issues

| # | Issue | Impact | Effort |
|---|---|---|---|
| 1 | JWT carries no `id` claim | Chat is completely blocked | 1 line |
| 2 | Notifications never saved | Notification API always returns 0 | 1 line |
| 3 | Activity logs never written | `activity_logs` table stays empty | Small |
| 4 | `TaskCommentController` path doubled | Endpoint unreachable | 1 line |
| 5 | No endpoint lists workspace members | Colleagues roster is guessed | Small |
| 6 | `TaskResponse.workspaceId` always null | Field is dead weight | 1 line |
| 7 | CORS rejects the dev frontend origin | Browser could not call the API | 1 line |

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

## 5. There is no endpoint that lists a workspace's members

`GET /workspaces/{id}` returns `{ id, name, type, owner }` and nothing else. There are
endpoints to add a member, change a member's role and remove a member, but none to read
the list.

Consequence on the frontend: the Colleagues page cannot show the real roster. It infers
one from the workspace owner plus everyone who appears as the creator or assignee of a
task in that workspace. A member who has never touched a task is invisible. This is
documented in the frontend README under known issues.

**Fix:** add `GET /workspaces/{workspaceId}/members` returning
`List<WorkspaceMemberResponse>`. That DTO already exists. This also unblocks an assignee
picker on the task form, which is a prerequisite for notifications ever firing.

## 6. `TaskResponse.workspaceId` is always null

`GET /tasks/workspace/{id}` returns every task with `"workspaceId": null`, verified live.
`TaskMapper` ignores the workspace association on all three mappings, so the field is
never populated.

The frontend does not read it, so nothing is broken, but the field is currently dead
weight in the API contract.

**Fix:** map it from `task.workspace.id`, or drop the field from the DTO.

## 7. CORS rejects the development frontend

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

**Still worth fixing:** add `http://localhost:5173` to the allowed origins, and consider
whether two separate CORS configurations should exist at all. Having both
`WebConfig.addCorsMappings` and a `CorsConfigurationSource` bean is confusing, since the
bean wins for anything inside the security filter chain.
