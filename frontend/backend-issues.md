# Backend issues

Status verified 2026-09-07 against the merged backend at `e509b8a` (email verification), by
reading the source and measuring against the running API on a freshly migrated database.
Everything already fixed has been removed, so the numbering has gaps. What is left is what still
needs doing.

Issues 13 and 15 are gone because they are fixed. Issues 16, 17, 18 and 19 were each re-measured
after the merge and are all still open. Issues 20 to 24 are new, and all five come from the email
verification work.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a
given issue stays valid. The order of this file is by priority: everything that blocks a
feature comes first.

## Blocking

A mandatory requirement with nothing behind it, or a state a user cannot get out of.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 21 | A verification code cannot be resent, so a slow signup is locked out for good | The account can never be used, and the same email can never sign up again | Small |
| 17 | The hardened public API in the spec does not exist | A mandatory MVP requirement with nothing implemented behind it | Real work |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 19 | Only the move into Done is logged | Moving a card out of Done, or between To do and Doing, leaves no trace | Small |
| 16 | `WorkspaceResponse` omits `description` | Editing a team silently wipes its description, and no client can prevent it | 1 line |
| 18 | `POST /workspaces` returns 500 on a long description | A description over 500 characters crashes team creation instead of being rejected | 1 line |
| 20 | Signing in before verifying returns 500 | The one error every new user will hit says nothing about verifying | Small |
| 22 | A failed verification email is swallowed | Signup answers 201 while the user is stranded with no code and no error anywhere | Small |
| 23 | Unknown URLs return 500 instead of 404 | Any client typo reads as a server crash, and a 404 is currently impossible | Small |
| 24 | `V1__init_schema.sql` was edited in place again | Every teammate has to wipe or hand-repair their database on each pull | Process |

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

## 19. Only the move into Done is logged, so the board's other transitions leave no trace

`updateTaskStatus` records the old status and hands it to one check:

```java
private void checkAndTriggerStatusEvents(Task task, TaskStatus oldStatus, User actor) {
    if (task.getStatus() == TaskStatus.DONE && oldStatus != TaskStatus.DONE)
        triggerTaskCompletedEvent(task, actor);
}
```

That fires on exactly one transition. `oldStatus` is computed and then used for nothing else, so
every other move writes no activity row at all.

Measured on the running backend, one task, five moves, counting rows after each:

| Move | Rows written |
|---|---|
| create | `TASK_CREATED` |
| TODO to DONE | `TASK_COMPLETED` |
| DONE to TODO | nothing |
| TODO to DOING | nothing |
| DOING to DONE | `TASK_COMPLETED` again |

Two consequences, both visible on the dashboard. Moving a card back out of Done looks like
nothing happened, because as far as the log is concerned nothing did. And because a completion is
written every time the task re-enters Done, a task finished three times shows three identical
`completed` lines with no `reopened` line between them, which reads as a duplication bug rather
than as real history.

**Fix:** log whenever the status actually changed, not only when it becomes DONE. Keep
`TASK_COMPLETED` for the move into Done and write the generic row only for the other transitions,
otherwise a TODO to DONE move writes two rows and trades one duplicate for another.

```java
if (task.getStatus() != oldStatus) {
    if (task.getStatus() == TaskStatus.DONE) {
        triggerTaskCompletedEvent(task, actor);
    } else {
        activityLogService.logActivity(task.getWorkspace().getId(), actor.getId(), task.getId(),
                "TASK_STATUS_CHANGED",
                String.format("%s %s moved task '%s' from %s to %s",
                        actor.getFirstName(), actor.getLastName(), task.getTitle(), oldStatus, task.getStatus()));
    }
}
```

**Do not reuse `TASK_UPDATED` for this.** `TaskEventListener.handleTaskAssignedEvent` already
emits `TASK_UPDATED` for a reassignment, and the frontend maps that action type to the label
`Reassigned`. A DONE to TODO move logged as `TASK_UPDATED` would render in the feed with a
"Reassigned" badge. A new action type avoids the collision.

The frontend needs no change to display it. `activityLog.js` humanizes any action type it does
not recognise, so `TASK_STATUS_CHANGED` renders as "Task status changed" the moment the backend
starts sending it, and gets a nicer label once it is added to the map.

Worth deciding at the same time: a completion currently also sends a notification. Whether
reopening somebody's finished task deserves the same notification is a product call, not a
technical one.

## 21. A verification code cannot be resent, so a slow signup is locked out for good

Signup creates the user with `enabled = false` and a code that expires 15 minutes later. There is
no endpoint to send a new one: `AuthController` exposes `signup`, `verify-email`, `login`,
`refresh`, `change-password`, `logout`, `forgot-password`, `reset-password` and `google`, and
nothing else.

That closes every door at once:

| Attempt | Result |
|---|---|
| Verify with the expired code | `verifyEmail` deletes it and throws "expired. Please request a new one" |
| Request a new one | No endpoint exists to request one |
| Sign up again with the same email | `signup` throws "Email is already registered!" |
| Sign in | Blocked, the account is still `enabled = false` |

The account is unreachable and the email address is permanently spent. Anyone who signs up and
steps away for lunch before typing the code is in this state.

The error message already promises the endpoint the API does not have, so the message is right
and the API is missing. **Fix:** a `POST /auth/resend-verification` taking an email, which
deletes any existing code for that user and issues a fresh one. `signup` already contains the
whole body of that method; it needs lifting into a private helper the two share.

## 20. Signing in before verifying the email returns 500

`UserPrincipal.isEnabled()` now returns `user.isEnabled()`, so `DaoAuthenticationProvider` throws
`DisabledException` for an unverified account. `UserService.login` catches only
`BadCredentialsException`, and `GlobalExceptionHandler` has no handler for `DisabledException`, so
it reaches the catch-all and comes back as a server crash.

Measured on the running backend, on a fresh database:

```
POST /auth/signup                       ->  201  "Verification code has been sent to your email."
POST /auth/login  (not yet verified)    ->  500  "An unexpected server error occurred."
POST /auth/verify-email  (correct code) ->  200  access and refresh tokens
POST /auth/login  (after verifying)     ->  200
```

Backend log for the 500: `org.springframework.security.authentication.DisabledException: User is
disabled`.

This is the single most likely error in the whole product: it is what a new user gets by closing
the verification page and trying to sign in. It should be a 403 that says the email still needs
confirming, so the frontend can send them back to the code screen. Right now the message carries
no hint, and the frontend cannot tell this apart from a genuine crash.

**Fix:** catch `DisabledException` in `login`, or add a handler for it, and return a 403 whose
message names the cause.

## 22. A failed verification email is swallowed, so signup can report success and strand the user

`EmailService.sendEmail` is `@Async` and wraps the send in a try/catch that only logs:

```java
} catch (Exception e) {
    log.error("Infrastructure Error: Failed to send email to [{}]. Reason: {}", to, e.getMessage());
}
```

Because it is asynchronous, `signup` has already returned 201 by the time a failure is known, and
because the exception is swallowed, nothing reaches the caller. If the mail send fails, the user
sees "Verification code has been sent to your email", no code ever arrives, and issue 21 means
there is no way to ask for another. The only trace is a line in the container log.

Sending really does work today, so this is latent rather than broken: measured on the running
backend, the log shows `Email successfully sent`. What makes it worth fixing is what it depends
on. `application.yaml` carries a single personal Gmail account and an app password committed in
plaintext. Google revokes app passwords on its own, and when that happens every signup in the
product silently stops working with no failing test and no error surface.

**Fix:** two separate things. Give the failure a surface, by recording the send outcome or by
retrying, so a broken mailer is visible. And move the credential to an environment variable, which
is the same rotation that was already planned for the other secrets.

## 23. Unknown URLs return 500 instead of 404

Deleting the duplicate endpoints was right, and the old paths are gone. What they return now is
wrong:

```
PUT  /users/profile          ->  500  "An unexpected server error occurred."
POST /users/change-password  ->  500  "An unexpected server error occurred."
```

The log gives the reason: `NoResourceFoundException: No static resource users/profile.` Spring
raises it correctly and then the catch-all `@ExceptionHandler(Exception.class)` converts it into a
server crash. Nothing is actually wrong with the server, and no 404 can ever be produced by this
API.

This is the same missing-handler pattern as issues 18 and 20, and the three together are one
decision: the catch-all is too wide. `NoResourceFoundException` should map to 404,
`DataIntegrityViolationException` to 409 or 400, `DisabledException` to 403. The catch-all should
be the last resort for genuinely unexpected failures, which is what makes its log line
`CRITICAL ERROR internal server crash` accurate.

## 24. `V1__init_schema.sql` was edited in place a second time

The email verification work added `enabled` to `users` and a whole `verification_codes` table by
editing `V1__init_schema.sql` rather than adding `V2__email_verification.sql`.

Flyway stores a checksum of every applied migration. Editing an applied file makes that checksum
stop matching, and the backend refuses to start with a validation error on any database that
already ran the old V1. The first time this happened it was `provider` and `provider_id`; this is
the second.

Every teammate who pulls now has to either drop their database and lose their local data, or
hand-repair the `flyway_schema_history` checksum and hand-write the `ALTER TABLE` statements the
edit implies. Neither is something a migration tool should require, and both get more expensive as
more people hold real local data.

There is a further trap in this particular edit. `enabled BOOLEAN NOT NULL DEFAULT FALSE` means
that anyone who hand-repairs instead of wiping ends up with every pre-existing account disabled,
and with no resend endpoint (issue 21) none of those accounts can be recovered. Wiping is
currently the only clean path.

**Fix:** treat applied migrations as immutable. New schema goes in a new numbered file. `V1`
should not change again now that more than one person has run it.
