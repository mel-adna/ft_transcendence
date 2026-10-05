# Backend issues

Status checked 2026-10-05 against `9112e30` on `mdbentaleb`, merged with mel-adna's branch. Only
unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

`backend/frontend-issues.md` numbers its frontend issues 42 to 44, so new backend issues here start
at 45. Its 39 is the same as 39 below.

## Not blocking

Real defects, but nothing visible is broken.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 45 | The sign-up link in an invitation email does not encode the address | An address containing `&`, `#` or `%` gives a link that fills in the wrong address | 1 line |
| 46 | When the invitation email fails, the invitee gets no notification | The bell entry and the live update are skipped, although the invitation is saved | Small |
| 47 | Task requests are limited to 100 a minute per address, but the import accepts 500 rows | An import over about 100 rows stops halfway, fewer when rows need a status change | Small |
| 48 | `nginx-exporter` always shows as unhealthy | Its health check calls `wget`, which the image does not have; anyone running `docker ps` at the evaluation sees "unhealthy" | 1 line |
| 39 | The socket client logs to the console on every page | With chat-service down, every page prints connection errors, and the subject rejects a project with console errors | Small |
| 28 | The login limit counts successful logins, not just failed ones | Signing in and out a few times spends the budget, then it is one attempt every three minutes | 1 number |
| 30 | The dead public API key is still committed | Reads like a working credential, and it is in the public history | Delete 3 lines |

---

# Not blocking

## 45. The sign-up link in an invitation email does not encode the address

`WorkspaceInvitationEventListener` builds the link for an invitee without an account by
concatenation:

```java
actionUrl = frontendUrl + "/signup?email=" + inviteeEmail;
```

A `+` in the address arrives as a space, which the sign-up page turns back into a `+`. An address
containing `&`, `#` or `%` still gives a link that fills in the wrong address or none.

**Fix:** `URLEncoder.encode(inviteeEmail, StandardCharsets.UTF_8)`.

## 46. When the invitation email fails, the invitee gets no notification

`WorkspaceInvitationEventListener` sends the email first, then creates the notification and pushes
the live event. Since `sendEmail` throws on failure, a mail outage ends the method
before the notification exists. An invitee with an account then sees nothing in the bell and
nothing live, although the invitation is saved and appears in their list on the next reload.

**Fix:** create the notification and push the event first, or catch and log the send failure.

## 47. Task requests are limited to 100 a minute per address, but the import accepts 500 rows

`TaskController` carries a class level limit:

```java
@RateLimit(capacity = 100, durationInMinutes = 1, keyType = RateLimitKeyType.IP)
```

The task import on the dashboard accepts up to 500 rows and sends one `POST` per row, plus a
`PATCH` for every row whose status is not To-Do. Measured on 2026-10-05: 105 tasks created in one
burst gave 101 created and 4 answered 429. The import stops cleanly at the first 429 and reports
the rest as not imported, so nothing breaks, but an import over about 100 rows cannot finish in one
go.

**Fix:** a bulk endpoint such as `POST /tasks/workspace/{id}/import` that takes the rows in one
request, or a higher limit on `createTask` and `updateStatus` than on the rest of the controller.

## 48. `nginx-exporter` always shows as unhealthy

The health check added to `nginx-exporter` in `docker-compose.yml` runs `wget`, and the
`nginx-prometheus-exporter` image has no `wget` (and no shell), so every check fails with
`exec: "wget": executable file not found`. The exporter itself works: Prometheus lists the nginx
target as up. It only looks broken, but `docker ps` is the first thing an evaluator runs.

**Fix:** drop the health check for this one service, and let Prometheus report it.

## 39. The socket client logs to the console on every page

`infrastructure/socket/SocketClient.js` prints on connect, on disconnect and on every failed
attempt:

```js
console.error('[SocketClient] Connection error:', err.message);
```

The socket is held open on every page, so when chat-service is down, failed attempts print on the
dashboard, the task board and everywhere else. The subject's general requirements say the project
is rejected if warnings or errors appear in the browser console, and an evaluator who stops one
container to see what happens will see them.

**Fix:** drop the three console calls, or put them behind `import.meta.env.DEV`. The file is
aarab's and is vendored here unchanged, so it has to be fixed on his branch.

## 28. The login limit counts successful logins, so ordinary use spends the budget

`RateLimitAspect` advises with `@Before`, so a token is consumed before the method runs and
regardless of what it returns. A login that succeeds costs exactly as much as one that fails.
`AuthController.login` is still annotated:

```java
@RateLimit(capacity = 5, durationInMinutes = 15, keyType = RateLimitKeyType.IP_AND_EMAIL)
```

The bucket refills continuously, one token every three minutes with five available in a burst, so
this is a throttle rather than a lockout. It is still worth a change, because signing in and out
is a thing a person does on purpose, and doing it five times in a row is neither rare nor
suspicious.

**Fix:** raise the capacity so ordinary use cannot reach it (twenty per fifteen minutes still stops
a guessing run), or consume a token only when the call throws, with `@AfterThrowing` or an
`@Around` advice.

## 30. The dead public API key is still committed

The `public-key` line is still in `application.yaml`, although nothing in Java reads it, and the
key itself is committed in `secrets_example/public_api_key.txt.example`, which
`docker-compose.yml` passes to the backend as a secret. It is a dead key, but it reads like a
working credential and sits in the public history.

**Fix:** delete the line in `application.yaml`, the secret in `docker-compose.yml` and the example
file.
