# Backend issues

Status checked 2026-10-10 against `a1e072d` on `main`, which holds every branch. mdbentaleb and
mel-adna have newer commits on their own branches that are not checked here. Only unresolved
issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

Numbers 42 to 44 were used by mdbentaleb's old `backend/frontend-issues.md`, so backend issues here
start at 45. Its 39 is the same as 39 below.

## Fix before the evaluation

An evaluator can run into these during normal use.

| # | Issue | Why it matters | Effort | Who fixes it |
|---|---|---|---|---|
| 50 | The PDF export prints errors in the console | Exporting the dashboard after signing in prints five errors, and the subject rejects a project with console errors | 1 line | mel-adna |
| 52 | `main` dropped the dashboard filters and the custom date range | They still show on the dashboard but change nothing, so the advanced analytics dashboard (2 points) fails when an evaluator tries them | Restore 2 files | mdbentaleb |

## Not blocking

Real defects, but neither one breaks the app at the evaluation.

| # | Issue | Why it matters | Effort | Who fixes it |
|---|---|---|---|---|
| 49 | `make` does not create new secret files when `secrets/` already exists | After pulling the Redis password, a teammate who ran `make` before cannot start the stack | 1 line | mdbentaleb |
| 39 | The socket client logs to the console on every page | With chat-service down, every page prints connection errors, and the subject rejects a project with console errors | Delete 3 lines | aarab |

---

# Fix before the evaluation

## 50. The PDF export prints errors in the console

The dashboard's "Export PDF" button (mel-adna's `features/dashboard/StatsDashboard.jsx`) turns the
page into an image with `html-to-image`. Before drawing, the library reads every stylesheet on the
page to embed web fonts. The sign-in page loads Google's sign-in script, which adds its own
stylesheet (`accounts.google.com/gsi/style`), and that stylesheet stays in the page after signing
in. The library is not allowed to read it or fetch it from our address, so it prints five errors,
although the PDF itself comes out fine:

```text
Error inlining remote css file SecurityError: Failed to read the 'cssRules' property from 'CSSStyleSheet'
Access to fetch at 'https://accounts.google.com/gsi/style' from origin 'https://localhost' has been blocked by CORS policy
```

Reloading the dashboard before exporting removes Google's stylesheet, which is why it is easy to
miss. The app loads no web fonts (`Inter` is only used when it is installed on the computer), so
this step embeds nothing anyway. Still there on `main` on 2026-10-10.

**Fix (mel-adna):** add `skipFonts: true` to the `toJpeg(...)` options. Tested on 2026-10-07 by
changing the running container only: the console stays clean and the PDF has the same size
(320 KB).

## 52. `main` dropped the dashboard filters and the custom date range

mdbentaleb's "fix merge errors" commit on `main` (`a1e072d`, 2026-10-08) put back his older
`StatsController` and `WorkspaceStatsService`. The stats API takes only `days` again: the `from`,
`to`, `status`, `priority` and `assigneeId` parameters that mel-adna added are gone. The dashboard
still sends them, and Spring ignores parameters it does not know, so nothing fails visibly.
Measured on 2026-10-10 with three tasks, one of them in progress:

```text
GET /workspaces/{id}/stats?days=7&status=DOING    totalTasks 3, expected 1
GET /workspaces/{id}/stats?from=2026-10-01        200, expected 400
```

Choosing "In Progress" on the dashboard still shows every task, and a custom range always shows
the last 7 days. The same commit deleted `WorkspaceStatsServiceTest`, which tested these filters.
If it comes back, its member mocks need `findByWorkspaceIdWithUser` (8 places).

**Fix (mdbentaleb):** restore both files from `3ffe6c9`, which is already in `main`'s history and
combines mel-adna's filters with his member query:

```text
git checkout 3ffe6c9 -- backend/src/main/java/com/teampulse/backend/controller/StatsController.java backend/src/main/java/com/teampulse/backend/service/WorkspaceStatsService.java
```

This drops the two count queries added on 2026-10-08 (`countTasksByStatusForWorkspace` and
`countTasksByPriorityForWorkspace`). They count every task in the team, so they cannot follow the
filters, and the service loads the whole task list anyway for the member table. Tested on
2026-10-10 in a throwaway build: it compiles against `main`, and the filters, the custom range and
its checks all work again.

# Not blocking

## 49. `make` does not create new secret files when `secrets/` already exists

The `secrets` target in the `Makefile` copies every `secrets_example/*.txt.example` that is missing
from `secrets/`. Nothing marks `secrets` as `.PHONY`, so once the `secrets/` folder exists, make
treats the target as an up-to-date folder and skips it:

```text
$ make secrets
make: `secrets' is up to date.
```

The Redis password added on 2026-10-05 (`redis_password.txt`) is therefore never created for
anyone who ran `make` before, and `docker compose up` stops with "bind source path does not exist"
for Redis, the backend and chat-service. A fresh clone at the evaluation is not affected, since it
has no `secrets/` folder yet.

**Fix (mdbentaleb):** add `.PHONY: all secrets ps clean fclean backend re` at the top of the
`Makefile`. Until then, `make -B secrets` creates the missing files without touching the existing
ones.

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

**Fix (aarab):** delete the three console calls. Putting them behind `import.meta.env.DEV` would
hide nothing: the frontend container runs `npm run dev`, so `DEV` is true in the app the evaluator
opens. The file is aarab's and is vendored here unchanged, so it has to be fixed on his branch.
