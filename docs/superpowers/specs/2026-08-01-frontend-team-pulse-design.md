# Team-Pulse Frontend Design

Date: 2026-08-01
Owner: szemmouri (Member 3, Frontend)
Branch: `szemmouri` (from `origin/mdbentaleb`)
Scope: everything under `frontend/`

## 1. Goal

Build the complete Team-Pulse frontend: seven screens from `design/`, wired to the real
backend, responsive on desktop and mobile, with no hardcoded fake data and no console
errors. The code must be simple enough to explain out loud during a 1337 evaluation.

Two constraints shape every decision below:

- No comments in the code. Names and structure carry the meaning. A separate README
  explains the whole thing.
- No cleverness. If a simpler version works, it wins.

## 2. Starting state

`frontend/` currently contains one `App.jsx` (a sidebar where every tab renders the same
dashboard because the nav is not wired to anything), one `StatsDashboard.jsx` (all numbers
hardcoded, calling a `/stats/summary` endpoint that does not exist), and the default Vite
template files. There is no router, no auth, and no API layer.

## 3. Backend reality

The backend is **Java Spring Boot**, not the Node/Express/Prisma stack the root README
describes. Base URL is `/api/v1` on port 8080.

### Endpoints that exist and work

| Area | Method and path |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh` |
| Auth | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| User | `GET /users/me`, `PUT /users/profile`, `POST /users/change-password` |
| User | `GET /users/search?...`, `DELETE /users/me` |
| Workspace | `GET /workspaces`, `POST /workspaces`, `GET /workspaces/{id}` |
| Workspace | `PUT /workspaces/{id}`, `DELETE /workspaces/{id}` |
| Members | `POST /workspaces/{id}/members`, `PUT /workspaces/{id}/members/role`, `DELETE /workspaces/{id}/members/{memberEmail}` |
| Tasks | `POST /tasks/workspace/{workspaceId}`, `GET /tasks/workspace/{workspaceId}` |
| Tasks | `GET /tasks/{id}`, `PUT /tasks/{id}`, `PATCH /tasks/{id}/status`, `DELETE /tasks/{id}` |
| Notifications | `GET /notifications`, `/unread`, `/unread-count`, `PATCH /{id}/read`, `PUT /read-all` |

### Payload shapes

```
AuthResponse    { accessToken, refreshToken, tokenType, user }
UserResponse    { id, firstName, lastName, avatarUrl, email }
WorkspaceResponse { id, name, type, owner }
TaskResponse    { id, workspaceId, title, description, status, priority,
                  assignee, creator, createdAt, updatedAt }
```

- `status` is `TODO | DOING | DONE`
- `priority` is `LOW | MEDIUM | HIGH`
- `type` is `PERSONAL | ORGANIZATION`
- Signup password must match: at least 8 chars, one lowercase, one uppercase, one digit,
  one special character from `@$!%*?&#`. The frontend validates the same rule so the user
  sees the requirement before submitting, not after a 400.

### Gaps the frontend must work around

1. **No stats endpoint.** Handled: computed in the browser from the task list.
2. **No CSV endpoint.** Handled: export and import both run in the browser.
3. **No `GET /workspaces/{id}/members`.** `WorkspaceResponse` carries only the owner.
   Handled: the Colleagues page derives the roster from the owner plus every distinct
   assignee and creator on the workspace's tasks. Adding and removing members works
   normally because those endpoints exist. A member who has no tasks and did not create
   any will not appear until they do.
4. **No avatar upload endpoint.** `ProfileUpdateRequest` accepts an `avatarUrl` string, so
   Settings offers an image URL field, not a file picker.
5. **No `dueDate` on tasks.** The completion trend chart buckets DONE tasks by `updatedAt`.

### Cross-team blockers (not fixable from the frontend)

- **Chat auth will 401.** aarab's chat backend requires a JWT containing an `id` claim.
  The Java `JwtUtils.generateToken` sets only `subject` (the email). Every chat request and
  socket handshake fails with `AUTH_PAYLOAD_INVALID` until mdbentaleb adds
  `extraClaims.put("id", user.getId())`. The chat UI is wired correctly and will start
  working the moment that lands. This goes in the README verbatim.
- `TaskCommentController` is annotated `@RequestMapping("/api/v1")` while the app already
  sets `context-path: /api/v1`, so its real paths are `/api/v1/api/v1/tasks/...`. Task
  comments are not used by any screen in this spec, so this is recorded but not worked
  around.

## 4. Architecture

### Folder layout

```
frontend/src/
  main.jsx
  App.jsx                   routes only
  index.css                 theme tokens
  lib/
    api.js                  axios instance, JWT interceptor, 401 handling
    stats.js                task list -> dashboard numbers
    csv.js                  export and import
    validation.js           shared form rules
  context/
    AuthContext.jsx         current user, login, signup, logout
    WorkspaceContext.jsx    selected workspace, workspace list
  components/
    AppLayout.jsx           sidebar + header + mobile bottom nav
    ProtectedRoute.jsx
    Modal.jsx
    Field.jsx
    Avatar.jsx
    EmptyState.jsx
    Spinner.jsx
  pages/
    LoginPage.jsx
    DashboardPage.jsx
    TasksPage.jsx
    ChatPage.jsx
    ColleaguesPage.jsx
    TeamsPage.jsx
    CreateTeamPage.jsx
    SettingsPage.jsx
    PrivacyPage.jsx
    TermsPage.jsx
  features/
    chat/                   aarab's module, copied byte-for-byte
    dashboard/
      StatsDashboard.jsx    rewritten against real data
  infrastructure/
    socket/SocketClient.js  aarab's, copied byte-for-byte
```

Folder names follow the root README so the structure matches the documented plan, but
nesting stays shallow.

### The one rule that prevents the current mess

Every screen is a single responsive component. No `hidden md:block` desktop copy paired
with a `block md:hidden` mobile copy. The existing `StatsDashboard.jsx` writes its entire
content twice; that is why it is 392 lines for three numbers and two charts. Layout
differences are expressed with responsive utilities on one tree.

### Network layer

`lib/api.js` exports one axios instance:

- `baseURL` from `VITE_CORE_API_URL`, defaulting to `http://localhost:8080/api/v1`
- request interceptor attaches `Authorization: Bearer <token>`
- response interceptor: on 401, clear the token and redirect to `/login`
- a small `getErrorMessage(error)` helper so every page surfaces the backend's validation
  message instead of a generic failure

No component calls `fetch` or `axios` directly. There is exactly one way to reach the network.

### Environment variables

Three variables, because the app talks to two different backends:

| Variable | Points at | Used by | Default |
|---|---|---|---|
| `VITE_CORE_API_URL` | Java backend | `lib/api.js` | `http://localhost:8080/api/v1` |
| `VITE_API_URL` | Node chat backend | aarab's `chatApi.js` | `http://localhost:5005/api` |
| `VITE_WS_URL` | Node chat socket | aarab's `SocketClient.js` | `http://localhost:5005` |

`VITE_API_URL` deliberately keeps aarab's meaning rather than being reused for the Java
backend. Reusing it would silently point their chat module at the wrong server, and
correcting it would mean editing their files and creating merge conflicts. A
`frontend/.env.example` documents all three.

### Auth

`AuthContext` holds `{ user, loading, login, signup, logout }`.

The access token is stored in `localStorage` under the key **`token`**. This exact key is
required: aarab's `chatApi` and `SocketClient` both read `localStorage.getItem('token')`.
Using that key is what makes chat work without editing their files.

On boot, if a token exists, `GET /users/me` restores the session. A failure clears the
token and drops to the login page. `ProtectedRoute` renders a spinner while `loading` is
true so authenticated routes never flash the login screen on refresh.

### Workspace selection

Tasks are scoped by workspace, so the app always needs a selected one. `WorkspaceContext`
loads `GET /workspaces` after login, selects the last-used id from `localStorage` (falling
back to the first workspace), and exposes `{ workspaces, current, selectWorkspace, refresh }`.

A user with zero workspaces is routed to Create Team, because no other screen can function
without one.

"Team" in the UI and "workspace" in the API are the same thing. The UI says Team because
the mockups say Team.

## 5. Screens

| Route | Screen | Data source |
|---|---|---|
| `/login` | Login and Signup, tabbed | `POST /auth/login`, `POST /auth/signup` |
| `/` | Dashboard | `GET /tasks/workspace/{id}` counted in the browser |
| `/tasks` | Kanban board | tasks CRUD + `PATCH /tasks/{id}/status` |
| `/chat` | Chat | aarab's `ChatLayout` |
| `/colleagues` | Colleagues | owner + task participants, `GET /users/search` to add |
| `/teams` | Teams directory | `GET /workspaces` |
| `/teams/new` | Create team | `POST /workspaces` |
| `/settings` | Settings | profile, password, GDPR |
| `/privacy`, `/terms` | Legal pages | static |

### Dashboard

`lib/stats.js` is a pure function: task array in, view model out.

```
computeStats(tasks) -> {
  total, completed, inProgress, todo,
  activeColleagues,          distinct assignees
  completionTrend,           [{ label, completed }] per day for the last 7 or 30 days
  recentActivity             latest tasks by updatedAt
}
```

Being pure makes it the one piece worth a unit test, and it makes the dashboard trivial:
fetch tasks, call the function, render.

Recent Activity is built from real task transitions ("You moved X to Done"), replacing the
invented Sarah/John entries in the current file.

### Tasks

Three columns driven by `status`. Moving a card calls `PATCH /tasks/{id}/status` and
updates optimistically, rolling back on failure. Creating and editing use one modal with
the same form. Drag and drop uses the HTML5 API, no library; the card menu also offers a
plain "Move to" action so the board is usable on touch and by keyboard.

### Colleagues

Roster derived as described in section 3. Add member by email through
`POST /workspaces/{id}/members` with a role, remove through the delete endpoint. Online
dots come from aarab's presence hook when the socket is connected, and are simply absent
otherwise rather than showing a fake status.

### Settings

- Profile: first name, last name, avatar URL, via `PUT /users/profile`
- Password: `POST /users/change-password`
- Download my data: builds a JSON file in the browser from `/users/me`, `/workspaces`, and
  the tasks of each workspace, then triggers a download. This satisfies GDPR export
  without a backend endpoint.
- Delete my account: confirmation modal, then `DELETE /users/me`, then logout.
- Footer links to Privacy and Terms on every page.

### Chat

`ChatPage` renders `<SocketProvider getToken={...}><ChatLayout currentUserId={user.id} /></SocketProvider>`.
Files under `features/chat/` and `infrastructure/socket/` are copied from `origin/aarab`
unchanged, so git sees identical content and merges cleanly when aarab merges to main.
`INTEGRATION_EXAMPLE.jsx` is not copied; it is reference material, not application code.

## 6. Styling

Keep the existing dark theme tokens in `index.css` (they already match the mockups) and
extend with the semantic colors from `design/team_pulse/DESIGN.md`. Inter for UI text.
Tailwind utilities inline; no CSS modules, no styled-components.

No em dash in any user-facing string.

## 7. Cleanup

Delete:
- `src/assets/` (`hero.png`, `react.svg`, `vite.svg`, all unreferenced)
- `frontend/README.md` in its default Vite-template form, replaced by the real one

Rewrite: `App.jsx`, `StatsDashboard.jsx`.

Add dependencies: `react-router-dom`, `socket.io-client`.
Remove nothing from `package.json` that is in use; `recharts`, `axios`, and `lucide-react`
all stay.

Set `index.html` title to "Team Pulse" (currently "frontend").

## 8. Error handling

- Every page has three states: loading, error with a retry action, and empty.
- Form submit errors render the backend's validation message next to the form.
- No `console.log` or `console.error` left in shipped code. The plan requires a zero-error
  console and evaluators check it.

## 9. Testing

The project has no test runner and adding one is out of scope for the deadline. Verification
is manual, plus one exception: `lib/stats.js` and `lib/csv.js` are pure functions and get a
lightweight test if a runner is added later.

Manual verification checklist:
- signup, logout, login, refresh the page and stay logged in
- create a team, create tasks, move them across all three columns, delete one
- dashboard numbers change to match what the board shows
- CSV export downloads real rows; re-importing that file recreates the tasks
- every screen at 375px and at 1440px
- browser console clean on every route

## 10. Deliverable

`frontend/README.md`, written for the user to read and then explain to evaluators:
what each folder is for, how auth and the token flow work, how the dashboard computes its
numbers without a stats endpoint, which parts belong to teammates, the two known backend
blockers with their exact fixes, and how to run the thing.

## 11. Out of scope

Backend changes of any kind, Docker and nginx configuration, the notifications UI beyond
the header bell count, task comments, and the bonus list (i18n, RTL, global search,
browser notifications).
