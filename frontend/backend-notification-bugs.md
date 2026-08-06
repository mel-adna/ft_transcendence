# Backend issues found from the frontend

Found while wiring the React frontend to the Java API, 2026-08-01 to 2026-08-06.
Everything here was reproduced against the running stack, not read off the source.

Filed by szemmouri. Most items belong to mdbentaleb (Spring backend).

| # | Issue | Impact | Effort |
|---|---|---|---|
| 1 | Gmail app password committed to a public repo | Account takeover risk | Revoke now |
| 2 | JWT carries no `id` claim | Chat is completely blocked | 1 line |
| 3 | Notifications never saved | Notification API always returns 0 | 1 line |
| 4 | Activity logs never written | `activity_logs` table stays empty | Small |
| 5 | Event failures are swallowed | Both bugs above look like success | Decision |
| 6 | `TaskCommentController` path doubled | Endpoint unreachable | 1 line |
| 7 | No endpoint lists workspace members | Colleagues roster is guessed | Small |
| 8 | `TaskResponse.workspaceId` always null | Field is dead weight | 1 line |
| 9 | CORS rejects the dev frontend origin | Browser could not call the API | 1 line |
| 10 | Create and update DTOs disagree on `status` | Caused a real bug | Design |
| 11 | Timestamps have no timezone | Dashboard can bucket a task wrongly | Design |
| 12 | Flyway silently skips the schema migration | Backend will not boot on a used DB | Config |
| 13 | Two backends share one database | Fragile, and caused 12 | Team call |

---

## 1. A live Gmail app password is committed, and the repo is public

`backend/src/main/resources/application.yaml` lines 59 and 60 contain a real Gmail
address and a real Google app password, hardcoded. Unlike every other credential in
that file they are not wrapped in an environment variable placeholder.

`gh repo view mel-adna/ft_transcendence` reports `"visibility": "PUBLIC"`. Credentials
in public repositories are found by automated scanners, usually within hours.

This also breaks the team's own rule. The root README, section 7, says to keep all
secret credentials in `.env` and never commit them.

**What to do, in this order:**

1. Revoke the app password at https://myaccount.google.com/apppasswords. Do this first.
   It is the only step that actually stops the risk.
2. Replace both lines with placeholders, the same style as the rest of the file:
   `username: ${MAIL_USERNAME}` and `password: ${MAIL_PASSWORD}`.
3. Add the real values to `.env`, which is already gitignored.

Deleting the lines is not enough on its own. The values stay in git history and remain
readable through the commit that introduced them. Revoking is what matters. Purging
history with `git filter-repo` is optional and disruptive on a shared branch, so agree
it with the team before trying.

While in that file, note `jwt.secret` on line 83 has a hardcoded default and the Google
OAuth entries on lines 74 and 75 have placeholder text (`cliend id dyali`) as defaults.
The JWT default in particular means the app runs with a known signing key if
`JWT_SECRET` is unset, which is what happens in the current docker-compose.

## 2. The JWT carries no `id` claim, which blocks chat entirely

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

## 3. Notifications are never persisted

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

## 4. Activity logs are never written

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

## 5. Both failures above are invisible from outside

`TaskEventListener` catches both exceptions and calls `log.error`, then continues. That
is why the REST call still returns 200 and the frontend has no way to know anything went
wrong. A total failure looks identical to success.

Worth deciding deliberately whether these should stay best effort or should surface.
Best effort is defensible for notifications. What is not defensible is that nobody
noticed for weeks because nothing ever showed a symptom.

## 6. `TaskCommentController` is unreachable

It is annotated `@RequestMapping("/api/v1")`, but `application.yaml` already sets
`server.servlet.context-path: /api/v1`. The two combine, so its real paths are
`/api/v1/api/v1/tasks/{taskId}/comments`.

**Fix:** change the class mapping to `/tasks` and let the context path supply the prefix,
matching every other controller.

No frontend screen calls it, so nothing is broken today, but the endpoint does not exist
at the address anyone would expect.

## 7. There is no endpoint that lists a workspace's members

`GET /workspaces/{id}` returns `{ id, name, type, owner }` and nothing else. There are
endpoints to add a member, change a member's role and remove a member, but none to read
the list.

Consequence on the frontend: the Colleagues page cannot show the real roster. It infers
one from the workspace owner plus everyone who appears as the creator or assignee of a
task in that workspace. A member who has never touched a task is invisible. This is
documented in the frontend README under known issues.

**Fix:** add `GET /workspaces/{workspaceId}/members` returning
`List<WorkspaceMemberResponse>`. That DTO already exists. This also unblocks an assignee
picker on the task form, which is a prerequisite for notifications ever firing (see the
last section).

## 8. `TaskResponse.workspaceId` is always null

`GET /tasks/workspace/{id}` returns every task with `"workspaceId": null`, verified live.
`TaskMapper` ignores the workspace association on all three mappings, so the field is
never populated.

The frontend does not read it, so nothing is broken, but the field is currently dead
weight in the API contract.

**Fix:** map it from `task.workspace.id`, or drop the field from the DTO.

## 9. CORS rejects the development frontend

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

## 10. Create and update disagree about `status`

`TaskCreateRequest` has no `status` field at all, so a new task is always `TODO`.
`TaskUpdateRequest` marks `status` `@NotNull`, and `TaskController` binds it with
`@Valid`, so a `PUT` without `status` is rejected with a 400 before any service code runs.

Verified live: the same edit payload returns 400 without `status` and 200 with it.

This cost real debugging time on the frontend, because the two DTOs for the same resource
disagree and nothing documents it. The frontend now always resends the task's current
status on every edit.

Also worth knowing: `TaskService.updateTask` clears the assignee whenever `assigneeId` is
absent from the payload, so a partial update silently unassigns the task. That is
surprising for a field the caller did not mention.

**Suggestion:** make the two DTOs consistent, or make `PUT` a genuine partial update
(`PATCH` semantics) where omitted fields are left alone.

## 11. Timestamps have no timezone

`createdAt` and `updatedAt` are `LocalDateTime`, so they serialise as naive strings like
`2026-07-30T10:00:00` with no offset. The frontend has no way to know what zone they are in.

The dashboard's completion chart has to bucket tasks by day. It currently treats the
string as the server's wall clock. When the backend container runs in UTC and the browser
is in another zone, a task completed near midnight can land in the wrong bucket or fall
outside the window entirely.

**Fix:** return a timezone-aware instant (`Instant` or `OffsetDateTime`) so the client has
an actual point in time to convert rather than a string to guess at.

## 12. Flyway silently skips the schema migration

`application.yaml` sets `flyway.baseline-on-migrate: true` with `baseline-version: 1`.

If the database is not empty when the backend first starts, Flyway writes a BASELINE row
at version 1 and skips `V1__init_schema.sql` entirely. None of the Java tables get
created, and the app then dies on `Schema-validation: missing table [activity_logs]`.

This happened for real: aarab's chat backend reached the shared database first and created
its Prisma tables, so Flyway baselined and never ran. Recovery was to lower the baseline
so the migration became pending:

```bash
docker exec teampulse-postgres psql -U med -d teampulsedb \
  -c "UPDATE flyway_schema_history SET version='0' WHERE type='BASELINE';"
```

**Fix:** either turn `baseline-on-migrate` off so a mismatch fails loudly instead of
silently skipping, or give the Java backend its own database (see 13).

## 13. Two backends share one database

The Spring backend and aarab's Node chat backend both point at `teampulsedb`. Prisma
manages its own tables there and Flyway manages another set.

They do not collide today, because Flyway creates snake_case tables (`users`, `tasks`)
while Prisma creates quoted PascalCase ones (`"User"`, `"Room"`), and Postgres treats
those as different tables. That is luck, not design. It is also the direct cause of 12.

**Suggestion:** give each backend its own database. It is a one line change to a
connection string on each side and it removes a whole class of problem.

Related, for merge day: both backends occupy the `backend/` directory on their respective
branches. Whoever merges second will hit a real conflict there. Worth planning before it
happens rather than during.

---

## Why the frontend has no notification bell

The design mockups show a bell and the backend exposes five working notification
endpoints, but nothing is built against them, deliberately.

Issue 3 means completing a task writes no notification at all, so `unread-count` always
returns 0. A bell built today would be a permanently empty dropdown.

There is a second prerequisite beyond fixing 3. `TaskEventListener.java:59` only creates
a notification when `task.getAssignee() != null`, and the frontend has no assignee picker
because of issue 7, so tasks created through the UI are always unassigned and would
notify nobody even after the fix.

For notifications to work end to end:

1. Fix issue 3, the one-line `setId` removal.
2. Fix issue 4 so the activity feed has data too.
3. Add `GET /workspaces/{id}/members`, issue 7, which the Colleagues page also needs.
   Check the frontend README for more info.
4. Frontend adds an assignee picker to the task form.
5. Frontend adds the bell, unread count and dropdown.

Steps 4 and 5 are frontend work and are ready to start once 1 to 3 land.

## How to reproduce the notification failure

With the stack running, using any account:

```bash
P=http://localhost:8080/api/v1
T=$(curl -s -X POST "$P/auth/login" -H 'Content-Type: application/json' \
     -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | jq -r .accessToken)
ME=$(curl -s "$P/users/me" -H "Authorization: Bearer $T" | jq -r .id)
WS=$(curl -s "$P/workspaces" -H "Authorization: Bearer $T" | jq -r '.[0].id')

# create a task assigned to yourself, then complete it
TASK=$(curl -s -X POST "$P/tasks/workspace/$WS" -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"notif test\",\"description\":\"\",\"priority\":\"HIGH\",\"assigneeId\":\"$ME\"}" | jq -r .id)
curl -s -o /dev/null -X PATCH "$P/tasks/$TASK/status" -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"status":"DONE"}'

sleep 2
curl -s "$P/notifications/unread-count" -H "Authorization: Bearer $T"   # prints 0, should print 1
docker logs teampulse-backend 2>&1 | grep -iE "Failed to send|Failed to create"
```
