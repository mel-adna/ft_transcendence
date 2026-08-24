# Team Pulse frontend

Team Pulse is a task and team collaboration app: workspaces, a kanban task board, a dashboard, a colleagues roster, team chat, and account settings. This is the React frontend only. It has no data of its own; everything on screen comes from one of two backends over HTTP (see the table at the bottom of this file).

## Running it

1. `npm install`
2. `cp .env.example .env`
3. `npm run dev`, then open the URL Vite prints (normally `http://localhost:5173`)

What has to be running for the app to actually work:

- The Java backend on port 8080. Everything except the static `/privacy` and `/terms` pages depends on it: login and signup, the dashboard, tasks, colleagues, teams, and settings all call it directly.
- The separate Node chat backend on port 5005. Only the `/chat` route needs it. Every other page works fine without it.

The Colleagues page reads the team's real member list from `GET /workspaces/{id}/members`, and Settings uploads a real image file to `POST /users/me/avatar`. Both endpoints are new. Two known backend defects mean they do not fully work yet, and both are written up with their fixes in `backend-issues.md`, issues 5 and 8. The frontend degrades gracefully in each case rather than breaking.

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

`npm test` runs vitest against four files, 35 tests total:

- `lib/stats.test.js`
- `lib/csv.test.js`
- `features/colleagues/roster.test.js`
- `features/settings/dataExport.test.js`

These four are the only modules that are pure logic, decoupled from React and the DOM: `stats.js` turns a task array into dashboard numbers, `csv.js` reads and writes the import and export format, `roster.js` turns the members endpoint into the Colleagues list, and can rebuild that list from tasks when the endpoint cannot supply it, and `dataExport.js` assembles the GDPR export payload. Everything else in the app is JSX: composition, fetching, and rendering. Testing that would mean re-testing React and axios, not logic that was written here.

## Which code is whose

`features/chat/` and `infrastructure/socket/` are copied unchanged from a teammate's branch (aarab). They are vendored byte for byte so they merge cleanly with his work later, and they are never edited here, including the no-comments and no-console rules that apply to the rest of the app. `eslint.config.js` explicitly ignores both paths for the same reason.

Everything else under `frontend/src` was written for this task list.

## The two backends and the environment variables

| Variable | Points at | Used for |
|---|---|---|
| `VITE_CORE_API_URL` | `/api/v1`, a relative path | Everything except chat: auth, tasks, workspaces, colleagues, settings (`lib/api.js`) |
| `CORE_API_PROXY_TARGET` | Java backend, `http://localhost:8080` | Where Vite forwards `/api/v1` during development. Not read by app code |
| `VITE_API_URL` | Node chat backend, port 5005, base path `/api` | Chat's own REST calls: rooms, messages, search (`features/chat/services/chatApi.js`, vendored) |
| `VITE_WS_URL` | Node chat backend, port 5005 | The chat socket connection (`infrastructure/socket/SocketClient.js`, vendored) |

### Why the core API is a relative path and goes through a proxy

The Java backend allows a fixed list of browser origins in `SecurityConfig.corsConfigurationSource()`. For a while `http://localhost:5173`, where Vite's dev server runs, was not on that list, so the browser's preflight came back `403 Invalid CORS request` and every single request failed. It has since been added on the backend, so CORS would now work without the proxy. The proxy stays anyway, for the reason in the last paragraph.

The confusing part is that `curl` to port 8080 worked perfectly the whole time. CORS is enforced by browsers, not by servers refusing to answer, so a command line client never sees the problem.

`vite.config.js` proxies `/api/v1` to `CORE_API_PROXY_TARGET` and strips the `Origin` header on the way through. The browser now talks only to `localhost:5173`, which is its own origin, so CORS never applies. Note that `changeOrigin: true` alone is not enough: it rewrites `Host`, not `Origin`, and Spring reads `Origin`.

Because `VITE_CORE_API_URL` is relative rather than an absolute `http://localhost:8080/...`, the same value is also correct in production, where nginx serves the built frontend and the API from one origin. The alternative fix, adding `http://localhost:5173` to the backend's allowed origins, would work too and belongs to whoever owns `SecurityConfig`.

`VITE_API_URL` looks like it should be the main API, and `VITE_CORE_API_URL` looks like the odd one out. It is the other way round on purpose. The vendored chat code already reads `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_WS_URL` as the address of the chat service; that naming came from aarab's branch, and those files cannot be edited here. So this app's own network layer was given its own variable, `VITE_CORE_API_URL`, instead of repurposing `VITE_API_URL` for the Java backend. Reusing `VITE_API_URL` for the Java API would have silently pointed the chat module at the wrong backend.
