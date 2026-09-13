# Team Pulse frontend

Team Pulse is a task and team collaboration app: workspaces, a kanban task board, a dashboard, a colleagues roster, team chat, and account settings. This is the React frontend only. It has no data of its own; everything on screen comes from one of two backends over HTTP (see the table at the bottom of this file).

## Running it

1. `npm install`
2. `cp .env.example .env`
3. `npm run dev`, then open the URL Vite prints (normally `http://localhost:5173`)

What has to be running for the app to actually work:

- The Java backend on port 8080. Everything except the static `/privacy` and `/terms` pages depends on it: login and signup, the dashboard, tasks, colleagues, teams, and settings all call it directly.
- The separate Node chat backend on port 5005. Only the `/chat` route needs it. Every other page works
  fine without it. That service is not in this branch: it lives in `backend/` on `origin/aarab`, which is
  an Express + socket.io + Prisma app, not the Java one. With nothing listening on 5005 the Chat page
  detects it and shows an offline panel with a retry, rather than the browser's raw `Failed to fetch`.
  How that check works, and why it lives outside the vendored components, is under "Which code is whose".

The Colleagues page reads the team's real member list from `GET /workspaces/{id}/members`, Settings uploads a real image file to `POST /users/me/avatar`, and the dashboard's activity feed reads `GET /activity-logs/workspace/{id}`. All three endpoints are recent. The two defects that used to break the first two are fixed on the backend; what remains open is tracked in `backend-issues.md`.

Other scripts: `npm run build` produces the production bundle and `npm run lint` runs eslint.

## Folder map

Read the code in this order:

- `lib/` - logic with no React in it: the shared API client and token storage (`api.js`), the dashboard math (`stats.js`), CSV read and write (`csv.js`), and form validation rules (`validation.js`).
- `context/` - the two pieces of state almost every screen needs: who is logged in (`AuthContext`, `useAuth`) and which workspace is currently selected (`WorkspaceContext`, `useWorkspace`).
- `components/` - small reusable UI pieces with no page-specific logic (`Avatar`, `Modal`, `Spinner`, `EmptyState`, `Field`), plus the app shell (`AppLayout`) and the route guard (`ProtectedRoute`).
- `pages/` - one file per route registered in `App.jsx`. A page owns its own data fetching and decides what to render for loading, error, and empty.
- `features/` - the domain logic and screen pieces too big to live in a single page file, one folder per domain: `dashboard`, `tasks`, `colleagues`, `settings`, `chat`.

## How login works

Signing up takes two steps, and it is worth knowing why the code looks the way it does. `POST /auth/signup` does not return tokens. It creates the account disabled, emails a 6 digit code that expires in 15 minutes, and answers with a plain string. So `signup()` in `AuthContext` no longer stores anything; it just makes the call, and `LoginPage` sends the person to `/verify-email` with their address in router state. `pages/VerifyEmailPage.jsx` posts that address and the code to `POST /auth/verify-email`, and *that* is the call that returns the two tokens and completes the session. The page also carries its own email field, used when there is no router state, so refreshing the page or arriving by URL is not a dead end.

Signing in with an account that has never been verified is now a route, not an error. The backend answers `403` with `errors.errorCode` set to `EMAIL_NOT_VERIFIED`, and it sends a fresh code as part of that same request, so `LoginPage` catches it with `isEmailNotVerified()` and sends the person to `/verify-email` carrying `{ email, codeSent: true, fromLogin: true }`. The page says a new code has been sent rather than silently waiting, and it never calls resend itself, because the login request already did.

The resend button sits under the confirm button on a 60 second cooldown, counted down in a `useEffect` so the label reads "Resend code in 43s". The cooldown starts at 60 on arrival, since a code was just sent; someone landing on the page directly, with no router state, starts at zero and gets an email field to fill in. A wrong code leaves the page open, clears the code input and shows the server's message.

`isEmailNotVerified()` checks the `errorCode` first and falls back to matching the message text, so it keeps working against a backend build that has not added the code yet. It lives in `lib/api.js` with the other pure decisions.

The login form (`pages/LoginPage.jsx`) posts email and password to `POST /auth/login`. The response carries two tokens. The `accessToken` is written to `localStorage` under the key `token` by `setToken()` in `lib/api.js`, and the `refreshToken` under `refreshToken`. From then on, one axios request interceptor, also in `lib/api.js`, reads the access token on every outgoing request and attaches `Authorization: Bearer <token>` automatically: no page ever sets that header itself.

A matching response interceptor watches every response. When a request comes back with an ended session, it does not log the user out straight away. It calls `POST /auth/refresh` with the stored refresh token, saves the new tokens, and replays the original request, so a session that has been open longer than the access token's lifetime keeps working without the user noticing. Only if the refresh itself fails are both tokens cleared and the browser sent to `/login`.

Refresh tokens rotate: the backend deletes the one you present and returns a new one, so an old token stops working the moment it is used. `setRefreshToken` saves the replacement on every refresh, which is what keeps a session alive. Signing out calls `POST /auth/logout` through `revokeRefreshToken()` so the token is destroyed on the server too, not just forgotten by the browser. That call is wrapped so a failure cannot leave someone stuck signed in: the local session is cleared either way. Three guards keep this from looping: a request is only retried once, `/auth/login`, `/auth/signup`, `/auth/verify-email` and `/auth/refresh` are never retried, and concurrent 401s share a single in-flight refresh instead of each firing their own. That decision is a plain function, `shouldRefresh()`, kept apart from the interceptor so it can be read on its own.

One detail there is worth knowing, because it is the difference between a session that survives and one that does not. An expired token does **not** produce a `401`. `JwtAuthenticationFilter` catches `ExpiredJwtException`, logs it and calls `doFilter`, so the handler written for that exception never runs; the request arrives at the authorization layer unauthenticated, and with no `AuthenticationEntryPoint` configured Spring answers `403`. Measured with a correctly signed, genuinely expired token, `GET /users/me` returns `403 {"message":"Forbidden"}`. So `isSessionExpired()` accepts a `401`, or a `403` whose body is the literal `Forbidden`. Every `403` the application raises itself carries a real sentence, which is what keeps `EMAIL_NOT_VERIFIED` and the workspace permission errors out of the refresh path.

The key has to stay named exactly `token`. The vendored chat module (`features/chat/`, `infrastructure/socket/`) reads `localStorage.getItem('token')` directly to authenticate its own REST calls and its socket connection. Renaming the key, even to something more conventional like `accessToken`, would silently break chat login for no visible reason.

## How the dashboard gets its numbers

There is no backend endpoint that returns dashboard statistics. The Analytics Overview page fetches the same task list every other screen uses (`GET /tasks/workspace/{id}`) and counts everything in the browser, in `lib/stats.js`: totals by status, distinct assignees as "active colleagues," and a day-by-day completion trend. `stats.js` is a pure function (tasks in, numbers out).

The Recent Activity panel on the same page is the exception. It reads the real audit trail from `GET /activity-logs/workspace/{id}`, fetched in `DashboardPage` through `features/dashboard/useActivityLogs.js`. That endpoint returns a Spring `Slice`, so the rows are under `response.data.content`, not the response body itself. `features/dashboard/activityLog.js` turns each row into something displayable and is where the action types (`TASK_COMPLETED`, `WORKSPACE_MEMBER_ADDED`, and so on) get their labels. An action type the frontend has never seen is humanized automatically rather than dropped, so new backend events show up without a frontend change.

The panel has a fallback, and it is worth knowing why. It was added when the backend logged almost nothing, so creating a task and dragging it to Done wrote zero rows. Those gaps are fixed: creating, deleting, assigning (including assigning to yourself) and completing a task all write real rows now, re-measured on 2026-09-07. When the API trail still comes back empty, `deriveActivityFeed` builds the list from the task list instead, which is what this panel did before it was wired to the endpoint. Real audit rows win whenever there are any; the derived list only fills the gap.

Every board move is logged now. Entering Done still writes `TASK_COMPLETED`, and any other transition writes `TASK_STATUS_CHANGED` with a description like "moved task 'X' from DONE to TODO", so dragging a card back out of Done leaves a trace instead of nothing. `activityLog.js` labels that action type "Moved". Worth remembering why it is a separate type rather than `TASK_UPDATED`: the assignment listener already emits `TASK_UPDATED` for a reassignment, and this panel labels that one "Reassigned", so reusing it would have put a "Reassigned" badge on a status change.

The fetch lives in `DashboardPage` rather than inside `StatsDashboard` for two reasons: the page returns a spinner while tasks load, so a fetch inside the chart component could not start until the task request had finished, and the CSV import needs to refresh the activity trail along with the task list when it is done.

The same is true of the app's two export features: CSV export and import (`lib/csv.js`) and the GDPR data export on the Settings page (`features/settings/dataExport.js`) are both built entirely client-side, because the backend does not expose a CSV endpoint or a personal-data export endpoint either. If asked where a number or a downloaded file comes from, the answer is almost always "computed in the browser from the task list," not "returned by an endpoint."

## Who a new task gets assigned to

`features/tasks/TaskFormModal.jsx` has an "Assign to" picker. Its options come from the same members endpoint the Colleagues page uses, so it only ever offers people who are really in the workspace, which matters because the backend rejects an `assigneeId` that is not a member of that workspace.

The default differs between creating and editing on purpose:

- **Creating.** The picker starts on the signed-in user, so a task created without touching the field belongs to its creator rather than to nobody.
- **Editing.** The picker starts on whoever is currently assigned.

"Nobody" is offered in both cases. Clearing an assignee is a real thing to want, the backend supports it (`assigneeId: null`), and the CSV import already creates unassigned tasks, so hiding the option on create would have made the two creation paths disagree.

The signed-in user is always in the list even if the members request failed, so the form still works when that endpoint is down.


## Editing a team, and changing a role

Two controls close gaps in screens that were otherwise read-only.

**Teams** has a pencil next to the delete button, on teams you own. It opens `EditTeamModal` and sends `PUT /workspaces/{id}`. That request needs `type` as well as `name`: the DTO marks it `@NotNull`, so a rename that omits it comes back 400.

The description field prefills from the workspace the list endpoint already returned. That used to be impossible: `WorkspaceResponse` omitted `description` entirely, so the form opened empty and warned that saving would overwrite whatever was stored. The field is in the response now, so the modal seeds from it and sends it back unchanged unless it is edited. The underlying behaviour has not changed, a PUT that omits `description` still nulls it, but that is ordinary full-replace PUT semantics and the form no longer has any reason to omit it.

**Colleagues** turns the role badge into a select, sending `PUT /workspaces/{id}/members/role` with the member's email and the new role. It stays a plain badge for the workspace owner and for yourself, matching the rule the Remove button already used, so you cannot lock yourself out of your own team. Only admins may call it; anyone else gets refused by the backend.


## Colours come from tokens, not from the markup

Tailwind v4 is configured in CSS, so there is no `tailwind.config.js` and its absence is correct. The palette lives in the `@theme` block at the top of `src/index.css`, and that block is the only place a hex value for a UI colour is written:

| Token | Value | Reads as |
|---|---|---|
| `--color-primary` | `#3B82F6` | `bg-primary`, `text-primary`, `focus:border-primary` |
| `--color-canvas` | `#0c0c14` | `bg-canvas`, the page behind everything |
| `--color-panel` | `#181824` | `bg-panel`, cards and modals |
| `--color-sidebar` | `#0e0e17` | `bg-sidebar` |
| `--color-card` | `#27273a` | `border-card`, the hairline between surfaces |
| `--color-body` | `#c2c6d6` | `text-body`, long-form text |
| `--color-muted` | `#71717A` | `text-muted`, secondary text and icons |

This used to be written out by hand: 334 arbitrary values like `bg-[#181824]` and `text-[#71717A]/50` across 26 files, while the `@theme` block sat there unreferenced. Changing one colour meant 334 edits. It is now one line.

Two details worth knowing before adding a token:

**Do not name a colour token after a built-in utility.** The first pass called the page background `--color-base`, which generated a `text-base` colour utility that silently replaced Tailwind's built-in `text-base` font size. Nine places that were sizing text would have started painting near-black text on a near-black background instead. The token is `--color-canvas` for that reason. The `text-*` namespace already holds every font size, so a colour token must not collide with one.

**Charts are the exception, and they have to be.** `StatsDashboard` passes colours to recharts as SVG presentation attributes (`stroke`, `stopColor`) and inline styles, which are not class names, so no utility can reach them. `var()` in an SVG presentation attribute is not reliable across browsers either. Those eight values live in a single `CHART` constant at the top of that file, and it has to be kept in step with `@theme` by hand.

The vendored chat under `features/chat/` still uses arbitrary values. That is deliberate: those files are never edited here, for the reason under "Which code is whose".

## Which code is whose

`features/chat/` and `infrastructure/socket/` are copied unchanged from a teammate's branch (aarab). They are vendored byte for byte so they merge cleanly with his work later, and they are never edited here, including the no-comments and no-console rules that apply to the rest of the app. `eslint.config.js` explicitly ignores both paths for the same reason.

`pages/ChatPage.jsx` is the exception, and it is ours. Because the vendored components cannot be edited, the check for whether the chat service is even up has to live outside them. `ChatPage` probes the same base URL `chatApi.js` uses, and only mounts `SocketProvider` and `ChatLayout` once something answers. If nothing does, it shows an offline panel with a retry instead. Any HTTP reply counts as up, including a 401 or a 404; only a network-level failure counts as down, which is the same failure the vendored client would hit. Gating the provider also stops socket.io from retrying a dead port forever in the background. The base URL is duplicated rather than imported, so it has to stay identical to the one in `chatApi.js`.

Everything else under `frontend/src` was written for this task list.

## The two backends and the environment variables

| Variable | Points at | Used for |
|---|---|---|
| `VITE_CORE_API_URL` | `/api/v1`, a relative path | Everything except chat: auth, tasks, workspaces, colleagues, settings (`lib/api.js`) |
| `CORE_API_PROXY_TARGET` | Java backend, `http://localhost:8080` | Where Vite forwards `/api/v1` during development. Not read by app code |
| `VITE_API_URL` | Node chat backend, port 5005, base path `/api` | Chat's own REST calls: rooms, messages, search (`features/chat/services/chatApi.js`, vendored) |
| `VITE_WS_URL` | Node chat backend, port 5005 | The chat socket connection (`infrastructure/socket/SocketClient.js`, vendored) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client id | Renders the Continue with Google button. Unset means the button is not rendered at all, which is the default. |

### Why the core API is a relative path and goes through a proxy

The Java backend allows a fixed list of browser origins in `SecurityConfig.corsConfigurationSource()`. For a while `http://localhost:5173`, where Vite's dev server runs, was not on that list, so the browser's preflight came back `403 Invalid CORS request` and every single request failed. It has since been added on the backend, so CORS would now work without the proxy. The proxy stays anyway, for the reason in the last paragraph.

The confusing part is that `curl` to port 8080 worked perfectly the whole time. CORS is enforced by browsers, not by servers refusing to answer, so a command line client never sees the problem.

`vite.config.js` proxies `/api/v1` to `CORE_API_PROXY_TARGET` and strips the `Origin` header on the way through. The browser now talks only to `localhost:5173`, which is its own origin, so CORS never applies. Note that `changeOrigin: true` alone is not enough: it rewrites `Host`, not `Origin`, and Spring reads `Origin`.

Because `VITE_CORE_API_URL` is relative rather than an absolute `http://localhost:8080/...`, the same value is also correct in production, where nginx serves the built frontend and the API from one origin. The alternative fix, adding `http://localhost:5173` to the backend's allowed origins, would work too and belongs to whoever owns `SecurityConfig`.

`VITE_API_URL` looks like it should be the main API, and `VITE_CORE_API_URL` looks like the odd one out. It is the other way round on purpose. The vendored chat code already reads `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_WS_URL` as the address of the chat service; that naming came from aarab's branch, and those files cannot be edited here. So this app's own network layer was given its own variable, `VITE_CORE_API_URL`, instead of repurposing `VITE_API_URL` for the Java backend. Reusing `VITE_API_URL` for the Java API would have silently pointed the chat module at the wrong backend.
