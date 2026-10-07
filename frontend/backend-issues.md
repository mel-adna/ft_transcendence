# Backend issues

Status checked 2026-10-07 against `c2953a6` on `mdbentaleb`, merged into `szemmouri`. Only
unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

`backend/frontend-issues.md` used 42 to 44 for its frontend issues, so backend issues here start
at 45. Its 39 is the same as 39 below.

## Not blocking

Real defects, but neither one breaks the app at the evaluation.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 49 | `make` does not create new secret files when `secrets/` already exists | After pulling the Redis password, a teammate who ran `make` before cannot start the stack | 1 line |
| 39 | The socket client logs to the console on every page | With chat-service down, every page prints connection errors, and the subject rejects a project with console errors | Delete 3 lines |

---

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
