# Team Pulse frontend

Team Pulse is a task and team collaboration app: workspaces, a kanban task board, a dashboard, a colleagues roster, team chat, and account settings. This is the React frontend only. It has no data of its own; everything on screen comes from one of two backends over HTTP (see the table at the bottom of this file).

## Running it

1. `npm install`
2. `cp .env.example .env`
3. `npm run dev`, then open the URL Vite prints (normally `http://localhost:5173`)

What has to be running for the app to actually work:

- The Java backend on port 8080. Everything except the static `/privacy` and `/terms` pages depends on it: login and signup, the dashboard, tasks, colleagues, teams, and settings all call it directly.
- The separate Node chat backend on port 5005. Only the `/chat` route needs it. Every other page works fine without it.

Other scripts: `npm run build` produces the production bundle, `npm run lint` runs eslint, `npm test` runs the unit tests (see Testing below).

## Folder map

Read the code in this order:

- `lib/` - logic with no React in it: the shared API client and token storage (`api.js`), the dashboard math (`stats.js`), CSV read and write (`csv.js`), and form validation rules (`validation.js`).
- `context/` - the two pieces of state almost every screen needs: who is logged in (`AuthContext`, `useAuth`) and which workspace is currently selected (`WorkspaceContext`, `useWorkspace`).
- `components/` - small reusable UI pieces with no page-specific logic (`Avatar`, `Modal`, `Spinner`, `EmptyState`, `Field`), plus the app shell (`AppLayout`) and the route guard (`ProtectedRoute`).
- `pages/` - one file per route registered in `App.jsx`. A page owns its own data fetching and decides what to render for loading, error, and empty.
- `features/` - the domain logic and screen pieces too big to live in a single page file, one folder per domain: `dashboard`, `tasks`, `colleagues`, `settings`, `chat`.

## How login works

The login form (`pages/LoginPage.jsx`) posts email and password to `POST /auth/login`. The response's `accessToken` is written to `localStorage` under the key `token` by `setToken()` in `lib/api.js`. From then on, one axios request interceptor, also in `lib/api.js`, reads that key on every outgoing request and attaches `Authorization: Bearer <token>` automatically: no page ever sets that header itself. A matching response interceptor watches every response; if any request comes back `401`, it clears the token and sends the browser to `/login`.

The key has to stay named exactly `token`. The vendored chat module (`features/chat/`, `infrastructure/socket/`) reads `localStorage.getItem('token')` directly to authenticate its own REST calls and its socket connection. Renaming the key, even to something more conventional like `accessToken`, would silently break chat login for no visible reason.

## How the dashboard gets its numbers

There is no backend endpoint that returns dashboard statistics. The Analytics Overview page fetches the same task list every other screen uses (`GET /tasks/workspace/{id}`) and counts everything in the browser, in `lib/stats.js`: totals by status, distinct assignees as "active colleagues," a day-by-day completion trend, and the most recently updated tasks for the activity feed. `stats.js` is a pure function (tasks in, numbers out) and has its own tests in `lib/stats.test.js`.

The same is true of the app's two export features: CSV export and import (`lib/csv.js`) and the GDPR data export on the Settings page (`features/settings/dataExport.js`) are both built entirely client-side, because the backend does not expose a CSV endpoint or a personal-data export endpoint either. If asked where a number or a downloaded file comes from, the answer is almost always "computed in the browser from the task list," not "returned by an endpoint."

## Testing

`npm test` runs vitest against four files, 34 tests total:

- `lib/stats.test.js`
- `lib/csv.test.js`
- `features/colleagues/roster.test.js`
- `features/settings/dataExport.test.js`

These four are the only modules that are pure logic, decoupled from React and the DOM: `stats.js` turns a task array into dashboard numbers, `csv.js` reads and writes the import and export format, `roster.js` derives the Colleagues list from the workspace and its tasks, and `dataExport.js` assembles the GDPR export payload. Everything else in the app is JSX: composition, fetching, and rendering. Testing that would mean re-testing React and axios, not logic that was written here.

## Which code is whose

`features/chat/` and `infrastructure/socket/` are copied unchanged from a teammate's branch (aarab). They are vendored byte for byte so they merge cleanly with his work later, and they are never edited here, including the no-comments and no-console rules that apply to the rest of the app. `eslint.config.js` explicitly ignores both paths for the same reason.

Everything else under `frontend/src` was written for this task list.

## Known issues

These are open, with the actual fix each one needs:

- **Chat returns 401 on every request.** aarab's chat backend expects the JWT to carry an `id` claim. The Java backend's `JwtUtils.generateToken` is only ever called with the single-argument overload, which passes an empty `extraClaims` map, so the token carries just the subject (the email). The fix belongs to mdbentaleb: add the user's id to `extraClaims` before building the token. Until then, `/chat` renders normally, but no rooms load: the sidebar just reads "No rooms yet," which looks identical to a real empty account.
- **The `/chat` route logs to the console.** The vendored chat module makes 11 `console.log`, `console.error`, and `console.warn` calls across its socket and error-handling code. While the chat backend is unreachable or rejecting its token (see above), those calls fire and `/chat` prints console output. The project spec grades zero console errors; every other route in this app is clean of them, confirmed by grepping the whole non-vendored source tree. Fixing this means either running a working chat backend so the error branches are never hit, or asking aarab to gate those calls behind `import.meta.env.DEV`. It cannot be fixed here without editing vendored files.
- **The Colleagues roster is inferred, not exact.** There is no `GET /workspaces/{id}/members` endpoint, so `features/colleagues/roster.js` builds the list from the workspace owner plus everyone who has created or been assigned at least one task in that workspace. A member who exists in the workspace but has never touched a task will not show up yet. Adding that endpoint would make the roster exact instead of inferred.
- **No avatar upload.** `PUT /users/profile` only accepts an `avatarUrl` string, so the Profile card in Settings takes an image link rather than a file. There is no endpoint to upload binary image data to.
- **`TaskCommentController` is unreachable.** It is mapped at `/api/v1`, but the app already sets `/api/v1` as its servlet context path, so its real paths are doubled (`/api/v1/api/v1/tasks/{taskId}/comments` and so on). No screen in this frontend calls it.
- **The dashboard's day buckets mix two clocks.** `lib/stats.js`'s `dayKey` slices the first ten characters off the backend's `updatedAt` value, a naive `LocalDateTime` in the server's own wall-clock time, while the trend's day buckets (`lastDays`) are built from the browser's local calendar. When the backend container runs in UTC and the browser sits in a different time zone, a task completed near midnight can land in the wrong bucket, a day early or missing from the window entirely. It stays hidden whenever the backend runs on the same machine as the demo, which is why it is easy to miss. The real fix belongs on the backend: return a timezone-aware instant instead of a naive `LocalDateTime`, so the frontend has an actual point in time to convert instead of a string to guess at.

Gotcha worth remembering: `POST /tasks/workspace/{id}` (create) does not accept a `status` field at all, a new task is always created as `TODO`, while `PUT /tasks/{id}` (edit) requires `status` and answers with a 400 if it is missing. `pages/TasksPage.jsx` handles this by always resending the task's current status on every edit. Missing that distinction is what made every task edit fail during the build, before it was caught.

## The two backends and the environment variables

| Variable | Points at | Used for |
|---|---|---|
| `VITE_CORE_API_URL` | Java backend, port 8080, base path `/api/v1` | Everything except chat: auth, tasks, workspaces, colleagues, settings (`lib/api.js`) |
| `VITE_API_URL` | Node chat backend, port 5005, base path `/api` | Chat's own REST calls: rooms, messages, search (`features/chat/services/chatApi.js`, vendored) |
| `VITE_WS_URL` | Node chat backend, port 5005 | The chat socket connection (`infrastructure/socket/SocketClient.js`, vendored) |

`VITE_API_URL` looks like it should be the main API, and `VITE_CORE_API_URL` looks like the odd one out. It is the other way round on purpose. The vendored chat code already reads `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_WS_URL` as the address of the chat service; that naming came from aarab's branch, and those files cannot be edited here. So this app's own network layer was given its own variable, `VITE_CORE_API_URL`, instead of repurposing `VITE_API_URL` for the Java backend. Reusing `VITE_API_URL` for the Java API would have silently pointed the chat module at the wrong backend.
