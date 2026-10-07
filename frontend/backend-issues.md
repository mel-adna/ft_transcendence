# Backend issues

Status checked 2026-10-07 against `c2953a6` on `mdbentaleb` and `ebec135` on `mel-adna`, both
merged into `szemmouri`. Only unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

`backend/frontend-issues.md` used 42 to 44 for its frontend issues, so backend issues here start
at 45. Its 39 is the same as 39 below.

## Fix before the evaluation

An evaluator can run into this during normal use.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 50 | The PDF export prints errors in the console | Exporting the dashboard after signing in prints five errors, and the subject rejects a project with console errors | 1 line |

## Not blocking

Real defects, but none of them breaks the app at the evaluation.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 49 | `make` does not create new secret files when `secrets/` already exists | After pulling the Redis password, a teammate who ran `make` before cannot start the stack | 1 line |
| 39 | The socket client logs to the console on every page | With chat-service down, every page prints connection errors, and the subject rejects a project with console errors | Delete 3 lines |
| 51 | The stats tests still mock the old member query | `mvn test` fails 11 of the 15 stats tests; the app is fine because the Docker build skips tests | Rename in 8 places |

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
this step embeds nothing anyway.

**Fix:** add `skipFonts: true` to the `toJpeg(...)` options. Tested on 2026-10-07 by changing the
running container only: the console stays clean and the PDF has the same size (320 KB).

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

**Fix:** add `.PHONY: all secrets ps clean fclean backend re` at the top of the `Makefile`. Until
then, `make -B secrets` creates the missing files without touching the existing ones.

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

**Fix:** delete the three console calls. Putting them behind `import.meta.env.DEV` would hide
nothing: the frontend container runs `npm run dev`, so `DEV` is true in the app the evaluator
opens. The file is aarab's and is vendored here unchanged, so it has to be fixed on his branch.

## 51. The stats tests still mock the old member query

`WorkspaceStatsService` now loads members with `findByWorkspaceIdWithUser` (mdbentaleb's change, so
each member's user comes in the same query). mel-adna's `WorkspaceStatsServiceTest` still prepares
`findByWorkspaceId`, so Mockito rejects the unused setup and the member lists come back empty:

```text
Tests run: 15, Failures: 2, Errors: 9
```

With the old name put back in a throwaway copy, all 15 pass, so this is the only cause. The Docker
build runs `mvn clean package -DskipTests`, so the app itself is not affected.

**Fix:** in the test, replace `findByWorkspaceId(workspaceId)` with
`findByWorkspaceIdWithUser(workspaceId)` (8 places).
