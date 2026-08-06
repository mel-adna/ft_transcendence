# Backend bug report: task completion events fail silently

Found: 2026-08-06
Reported by: szemmouri (frontend)
Owner: mdbentaleb (backend)
Severity: both bugs are silent. The API returns 200 and nothing is written.

## Summary

`TaskEventListener` has two jobs when a task is completed: write an activity log,
and create a notification for the assignee. Both throw, both are swallowed by the
listener's own `try/catch`, and both are only visible in the container logs.

Net effect: `notifications` and `activity_logs` are never written. Every call to
`GET /api/v1/notifications/unread-count` returns 0 no matter what the user does.

## How to reproduce

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

## Bug 1: notification is never persisted

`NotificationService.java:39`

```java
Notification notification = new Notification();
notification.setId(UUID.randomUUID());   // <-- remove this line
```

`Notification.java:37` already declares `@GeneratedValue(strategy = GenerationType.UUID)`,
so Hibernate is responsible for the id.

Spring Data's `SimpleJpaRepository.save()` decides between `persist()` and `merge()`
by asking whether the entity is new, and the default check is "is the id null".
Because the id was set by hand it is not null, so `save()` calls `merge()`, which
tries to update a row that does not exist.

Observed log:

```
c.t.backend.service.NotificationService : Persisting new notification in DB for user: ...
c.t.backend.event.TaskEventListener     : Failed to send notifications for completed task ID: ...
  Error: Row was updated or deleted by another transaction
         (or unsaved-value mapping was incorrect): [Notification#cd19a5b0-...]
```

The error text names the cause directly: "unsaved-value mapping was incorrect".

**Fix:** delete line 39. Nothing else changes.

**Confirming evidence:** `NotificationService` is the only service in the codebase
that assigns an id before saving, and it is the only one whose writes fail.
`TaskService`, `WorkspaceService` and `UserService` all let Hibernate generate the id
and all persist correctly.

## Bug 2: activity log is never written

`TaskEventListener.java:48-52`, in `processActivityLogging`.

The handler is `@Async`, so it runs on a different thread from the request. By the
time it runs, the Hibernate session that loaded the `Task` has closed, so the lazy
associations cannot be resolved. Line 50 calls `task.getWorkspace().getName()` and
line 52 calls `task.getWorkspace().getId()`.

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
- Carry the ids in the event itself rather than the entity, so the listener never
  touches a lazy association.
- Re-read the task inside the listener's own transaction, with the workspace and
  creator fetched eagerly (a `JOIN FETCH` query).
- Annotate the handler so it runs in a new transaction and load what it needs there.

The first is usually the cleanest: events should carry data, not detached entities.

## Bug 3, smaller: the failures are invisible

`TaskEventListener` catches both exceptions and calls `log.error`, then continues.
That is why the REST call returns 200 and the frontend has no way to know anything
went wrong. Worth deciding deliberately whether these should stay best-effort or
should surface. Best-effort is defensible for notifications, but the current code
makes a total failure look identical to success.

## Why the frontend has no bell yet

The design mockups show a notification bell, and the API for it is complete and
reachable. The frontend does not use it because of the above: a bell built today
would show a permanently empty dropdown.

There is also a second prerequisite. `TaskEventListener.java:59` only creates a
notification when `task.getAssignee() != null`, and the frontend has no assignee
picker, because there is no endpoint that lists a workspace's members to populate one.
So even after both bugs are fixed, tasks created through the UI would still notify
nobody.

For notifications to actually work end to end:

1. Fix bugs 1 and 2 above.
2. Add `GET /workspaces/{id}/members`, which the Colleagues page also needs.
3. Frontend adds an assignee picker to the task form.
4. Frontend adds the bell, unread count and dropdown.

Steps 3 and 4 are frontend work and are ready to start once 1 and 2 land.
