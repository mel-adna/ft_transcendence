# Team-Pulse Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Team-Pulse frontend (8 screens, responsive, wired to the real Spring Boot API) so it can be demoed and explained at a 1337 evaluation.

**Architecture:** One axios instance is the only path to the network. Two React contexts hold the two pieces of global state (who is logged in, which team is selected). Every screen is a single responsive component that reads from those contexts. Dashboard statistics and CSV export are pure functions over the task list, so no stats endpoint is needed.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, react-router-dom 7, axios, recharts, lucide-react, socket.io-client, vitest.

## Global Constraints

These apply to every task. No exceptions.

**Scope of these constraints:** they bind code written for this plan. They do
NOT bind `src/features/chat/**` and `src/infrastructure/socket/**`, which are
copied verbatim from `origin/aarab` in Task 11 and must stay byte-for-byte
identical so git merges cleanly. Never edit, reformat, de-comment, or
"fix" a file under those two paths. Any verification command in this plan
excludes them.

- **No comments in any source file.** Names and structure carry the meaning. The README explains the system.
- **No em dash (`—`) in any user-facing string.** UI copy, labels, placeholders, error text, seed data. Use a comma, a colon, parentheses, a spaced hyphen, or two sentences.
- **One responsive component per screen.** Never a `hidden md:block` desktop copy paired with a `block md:hidden` mobile copy. Layout differences use responsive utilities on one tree.
- **No `console.log` or `console.error` in committed code.** The evaluation requires a clean console.
- **No component calls `fetch` or `axios` directly.** Everything goes through `lib/api.js`.
- **Token localStorage key is exactly `token`.** aarab's chat module reads that key.
- **Core API base URL variable is `VITE_CORE_API_URL`.** Never reuse `VITE_API_URL`; that belongs to aarab's chat backend.
- Backend enum values, verbatim: `TaskStatus` = `TODO | DOING | DONE`. `TaskPriority` = `LOW | MEDIUM | HIGH`. `WorkspaceType` = `PERSONAL | ORGANIZATION`. `WorkspaceMemberRole` = `ADMIN | MEMBER | VIEWER`.
- Signup password rule, verbatim: at least 8 characters, one lowercase, one uppercase, one digit, one special character from `@$!%*?&#`.
- Every screen handles three states: loading, error with a retry action, empty.
- Commit after every task.

## Reference: API contract

Base URL `http://localhost:8080/api/v1`. All authenticated requests need `Authorization: Bearer <token>`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/signup` | `{firstName, lastName, email, password}` | `AuthResponse` |
| POST | `/auth/login` | `{email, password}` | `AuthResponse` |
| GET | `/users/me` | | `UserResponse` |
| PUT | `/users/profile` | `{firstName, lastName, avatarUrl}` | `UserResponse` |
| POST | `/users/change-password` | `{...}` | string |
| GET | `/users/search?email=<q>` | | `UserResponse[]` |
| DELETE | `/users/me` | | 204 |
| GET | `/workspaces` | | `WorkspaceResponse[]` |
| POST | `/workspaces` | `{name, description, type}` | `WorkspaceResponse` |
| GET | `/workspaces/{id}` | | `WorkspaceResponse` |
| DELETE | `/workspaces/{id}` | | 204 |
| POST | `/workspaces/{id}/members` | `{email, role}` | string |
| DELETE | `/workspaces/{id}/members/{email}` | | string |
| GET | `/tasks/workspace/{wsId}` | | `TaskResponse[]` |
| POST | `/tasks/workspace/{wsId}` | `{title, description, priority, assigneeId}` (no `status`) | `TaskResponse` |
| PUT | `/tasks/{id}` | `{title, description, status, priority, assigneeId}` | `TaskResponse` |
| PATCH | `/tasks/{id}/status` | `{status}` | `TaskResponse` |
| DELETE | `/tasks/{id}` | | 204 |

```
AuthResponse      { accessToken, refreshToken, tokenType, user }
UserResponse      { id, firstName, lastName, avatarUrl, email }
WorkspaceResponse { id, name, type, owner }
TaskResponse      { id, workspaceId, title, description, status, priority,
                    assignee, creator, createdAt, updatedAt }
```

Request-DTO traps, verified against the Java source:

- `TaskUpdateRequest` marks BOTH `status` and `priority` `@NotNull`, and the controller binds
  it with `@Valid`. A PUT missing `status` is rejected with a 400 before any service code
  runs. `TaskCreateRequest` has no `status` field at all, so a task is always created as
  `TODO`. The two DTOs differ; never infer one from the other.
- `TaskService.updateTask` clears the assignee whenever `assigneeId` is absent, so an edit
  must resend the task's existing `assignee.id` or it silently unassigns the task.
- `PasswordChangeRequest` is `{currentPassword, newPassword}`, min 8 with no character-class
  rule. `SignupRequest` is the strict one. The frontend applies the strict rule to both,
  which is safe because it is a superset.
- `WorkspaceMemberAddRequest` and `WorkspaceMemberRoleUpdateRequest` are both
  `{email, role}`; the delete endpoint takes the email in the path instead.

---

### Task 1: Clean the slate and set up routing

**Files:**
- Delete: `frontend/src/assets/` (hero.png, react.svg, vite.svg), `frontend/README.md`
- Modify: `frontend/package.json`, `frontend/index.html`, `frontend/src/App.jsx`
- Create: `frontend/.env.example`, `frontend/src/pages/` placeholder pages

**Interfaces:**
- Consumes: nothing
- Produces: route paths `/login`, `/`, `/tasks`, `/chat`, `/colleagues`, `/teams`, `/teams/new`, `/settings`, `/privacy`, `/terms`. Every page component is a named default export from `src/pages/<Name>Page.jsx`.

- [ ] **Step 1: Remove unused files**

```bash
cd frontend
rm -rf src/assets
rm README.md
```

These are verified unreferenced: `grep -rn "hero.png\|react.svg\|vite.svg" src index.html` returns nothing.

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install react-router-dom socket.io-client
npm install -D vitest
```

- [ ] **Step 3: Add the test script to package.json**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Set the page title**

In `frontend/index.html`, change `<title>frontend</title>` to:

```html
<title>Team Pulse</title>
```

- [ ] **Step 5: Create the env example**

Create `frontend/.env.example`:

```
VITE_CORE_API_URL=http://localhost:8080/api/v1
VITE_API_URL=http://localhost:5005/api
VITE_WS_URL=http://localhost:5005
```

- [ ] **Step 6: Create placeholder pages**

Create one file per page under `frontend/src/pages/`. Each is a minimal default export so routing can be verified before the real screens exist. Example for `DashboardPage.jsx`:

```jsx
export default function DashboardPage() {
  return <div className="p-8 text-white">Dashboard</div>;
}
```

Create the same shape for: `LoginPage.jsx`, `TasksPage.jsx`, `ChatPage.jsx`, `ColleaguesPage.jsx`, `TeamsPage.jsx`, `CreateTeamPage.jsx`, `SettingsPage.jsx`, `PrivacyPage.jsx`, `TermsPage.jsx`, each returning its own name.

- [ ] **Step 7: Replace App.jsx with routes only**

Replace the entire contents of `frontend/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ChatPage from './pages/ChatPage';
import ColleaguesPage from './pages/ColleaguesPage';
import TeamsPage from './pages/TeamsPage';
import CreateTeamPage from './pages/CreateTeamPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/colleagues" element={<ColleaguesPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/new" element={<CreateTeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 8: Verify the build and every route**

```bash
cd frontend && npm run build && npm run dev
```

Expected: build succeeds. Visit each of the 10 routes and confirm the matching placeholder text renders and the browser console is clean.

- [ ] **Step 9: Commit**

```bash
git add -A frontend
git commit -m "chore(frontend): remove template files, add router and route skeleton"
```

---

### Task 2: API layer and shared UI primitives

**Files:**
- Create: `frontend/src/lib/api.js`, `frontend/src/lib/validation.js`
- Create: `frontend/src/components/Spinner.jsx`, `Field.jsx`, `Modal.jsx`, `Avatar.jsx`, `EmptyState.jsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `api` (default export of `lib/api.js`), an axios instance
  - `getErrorMessage(error) -> string`
  - `setToken(value)`, `getToken() -> string | null`, `clearToken()`
  - `validatePassword(value) -> string | null` (null means valid)
  - `<Spinner />`, `<Field label id error>{input}</Field>`, `<Modal open onClose title>{children}</Modal>`, `<Avatar user size />`, `<EmptyState icon title message action />`

- [ ] **Step 1: Write the API module**

Create `frontend/src/lib/api.js`:

```js
import axios from 'axios';

const TOKEN_KEY = 'token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      clearToken();
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0];
    if (first) return String(first);
  }
  if (error?.message === 'Network Error') {
    return 'Cannot reach the server. Check that the backend is running.';
  }
  return 'Something went wrong. Please try again.';
}

export default api;
```

- [ ] **Step 2: Write the password validator**

Create `frontend/src/lib/validation.js`. This mirrors the backend regex exactly so the user sees the rule before submitting:

```js
export function validatePassword(value) {
  if (!value || value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[a-z]/.test(value)) return 'Password needs one lowercase letter.';
  if (!/[A-Z]/.test(value)) return 'Password needs one uppercase letter.';
  if (!/\d/.test(value)) return 'Password needs one number.';
  if (!/[@$!%*?&#]/.test(value)) {
    return 'Password needs one special character (@$!%*?&#).';
  }
  return null;
}

export function validateEmail(value) {
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  return null;
}

export function validateRequired(value, label) {
  if (!value || !value.trim()) return `${label} is required.`;
  return null;
}
```

- [ ] **Step 3: Write the UI primitives**

Create `frontend/src/components/Spinner.jsx`:

```jsx
export default function Spinner({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-5 w-5 animate-spin rounded-full border-2 border-[#71717A]/30 border-t-[#3B82F6] ${className}`}
    />
  );
}
```

Create `frontend/src/components/Field.jsx`:

```jsx
export default function Field({ label, id, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[#71717A]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-[#71717A]">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}
    </div>
  );
}
```

Create `frontend/src/components/Modal.jsx`. It closes on Escape and on backdrop click, and renders nothing when closed:

```jsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-2xl border border-[#71717A]/25 bg-[#181824] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#71717A] transition-colors hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

Create `frontend/src/components/Avatar.jsx`. Falls back to initials when there is no `avatarUrl`, which is the common case since there is no upload endpoint:

```jsx
export default function Avatar({ user, size = 32 }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const style = { width: size, height: size };

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        style={style}
        className="rounded-full border border-[#71717A]/30 object-cover"
      />
    );
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full border border-[#71717A]/30 bg-[#0c0c14] text-[10px] font-bold text-[#71717A]"
    >
      {initials}
    </div>
  );
}
```

Create `frontend/src/components/EmptyState.jsx`:

```jsx
export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#71717A]/25 p-10 text-center">
      {Icon && <Icon size={28} className="text-[#71717A]" />}
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {message && <p className="max-w-sm text-xs text-[#71717A]">{message}</p>}
      {action}
    </div>
  );
}
```

- [ ] **Step 4: Verify the build**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no unresolved imports.

- [ ] **Step 5: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add api client, validation rules and shared ui primitives"
```

---

### Task 3: Authentication

**Files:**
- Create: `frontend/src/context/AuthContext.jsx`, `frontend/src/components/ProtectedRoute.jsx`
- Rewrite: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `api`, `getErrorMessage`, `setToken`, `getToken`, `clearToken` from `lib/api.js`; `validatePassword`, `validateEmail`, `validateRequired` from `lib/validation.js`; `Field`, `Spinner`
- Produces:
  - `<AuthProvider>` wrapping the app
  - `useAuth() -> { user, loading, login, signup, logout, refreshUser }`
  - `login(email, password) -> Promise<void>`, `signup({firstName, lastName, email, password}) -> Promise<void>`
  - `<ProtectedRoute>` element wrapper

- [ ] **Step 1: Write AuthContext**

Create `frontend/src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setToken, getToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/users/me')
      .then((response) => setUser(response.data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const signup = useCallback(async (payload) => {
    const response = await api.post('/auth/signup', payload);
    setToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('workspaceId');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/users/me');
    setUser(response.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Write ProtectedRoute**

Create `frontend/src/components/ProtectedRoute.jsx`. The `loading` gate is what stops the login screen flashing on every refresh:

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0c14]">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
```

- [ ] **Step 3: Write LoginPage**

Rewrite `frontend/src/pages/LoginPage.jsx` to match `design/authentication_updated_logo/screen.png`: centred card, Team Pulse logo mark, Log In / Sign Up tab pair, email and password fields, primary Continue button, Privacy Policy and Terms links in the card footer.

Requirements:
- One component, one form. The `mode` state (`'login' | 'signup'`) decides whether first name and last name inputs render and which submit handler runs.
- Client-side validation runs on submit using `validateEmail`, `validateRequired`, and (signup only) `validatePassword`. Field errors render through `<Field error>`.
- On signup, show the password rule as a `hint` on the password field before the user types: `At least 8 characters, with an uppercase letter, a number and a special character (@$!%*?&#).`
- Submit button shows `<Spinner />` and is disabled while the request is in flight.
- Server errors render in a single alert above the button using `getErrorMessage(error)`.
- On success, `navigate('/', { replace: true })`.
- If `user` is already set, redirect to `/` immediately.
- Do not render the "Continue with Google" button from the mockup. The backend has an OAuth client configured with placeholder credentials (`cliend id dyali`), so the flow cannot work and a dead button costs marks.

- [ ] **Step 4: Wire the provider and protect the routes**

Modify `frontend/src/App.jsx`: wrap `<Routes>` in `<AuthProvider>` inside `<BrowserRouter>`, and wrap every element except `/login`, `/privacy`, and `/terms` in `<ProtectedRoute>`.

```jsx
<Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
```

- [ ] **Step 5: Verify against the real backend**

Start the backend (`docker compose up -d postgres redis` then run the Spring app), then `npm run dev`.

- Visit `/` while logged out. Expected: redirect to `/login`.
- Sign up with password `abc`. Expected: inline error "Password must be at least 8 characters.", no network request.
- Sign up with a valid password, for example `Test1234!`. Expected: lands on `/`, and `localStorage.getItem('token')` returns a JWT.
- Refresh the page. Expected: stays on `/`, no flash of the login screen.
- Run `localStorage.setItem('token', 'garbage')` and refresh. Expected: back to `/login`.
- Log in with a wrong password. Expected: the backend's message renders, console stays clean.

- [ ] **Step 6: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add auth context, protected routes and login screen"
```

---

### Task 4: App shell and workspace selection

**Files:**
- Create: `frontend/src/context/WorkspaceContext.jsx`, `frontend/src/components/AppLayout.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `useAuth`, `api`, `Avatar`, `Spinner`
- Produces:
  - `<WorkspaceProvider>`
  - `useWorkspace() -> { workspaces, current, loading, error, selectWorkspace, refresh }`
  - `<AppLayout>` wrapping every authenticated page

- [ ] **Step 1: Write WorkspaceContext**

Create `frontend/src/context/WorkspaceContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);
const STORAGE_KEY = 'workspaceId';

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentId, setCurrentId] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
      setCurrentId((previous) => {
        const stillExists = response.data.some((item) => item.id === previous);
        return stillExists ? previous : (response.data[0]?.id ?? null);
      });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const selectWorkspace = useCallback((id) => {
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentId(id);
  }, []);

  const current = workspaces.find((item) => item.id === currentId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, current, loading, error, selectWorkspace, refresh: load }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
```

- [ ] **Step 2: Write AppLayout**

Create `frontend/src/components/AppLayout.jsx`, matching `design/analytics_dashboard_updated_logo/screen.png` (desktop) and `design/dashboard_mobile/screen.png` (mobile) as **one component**.

Structure:
- Left sidebar, `hidden md:flex`, width 256px: logo mark plus "Team Pulse / SaaS Workspace", then a team switcher `<select>` bound to `selectWorkspace`, then nav links, then the current user at the bottom linking to `/settings`.
- Top header, `hidden md:flex`: search input (non-functional placeholder is acceptable here, it is not a listed MVP feature; give it `aria-label="Search"`), an "Add Task" button that navigates to `/tasks`, and the user avatar.
- Mobile header, `flex md:hidden`: team name centred, avatar on the right.
- Mobile bottom nav, `flex md:hidden`, fixed: Dashboard, Tasks, Chat, Settings.
- Content area: `<Outlet />` with `pb-24 md:pb-8` so the fixed mobile nav never covers content.
- Footer on every page with Privacy Policy and Terms of Service links.

Nav items, used by both the sidebar and the bottom nav from a single array:

```js
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/colleagues', label: 'Colleagues', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];
```

Use `NavLink` with its `isActive` render prop for the active state (blue text plus the left pill on desktop, blue rounded chip on mobile) so the nav reflects the real URL rather than local state. The previous implementation's bug was exactly this: it tracked an `activeTab` state that no screen read.

If `useWorkspace().workspaces` is empty and not loading, redirect to `/teams/new`, because no other screen can function without a workspace.

- [ ] **Step 3: Restructure App.jsx to use a layout route**

Modify `frontend/src/App.jsx` so authenticated pages are children of one layout route:

```jsx
<Route element={<ProtectedRoute><WorkspaceProvider><AppLayout /></WorkspaceProvider></ProtectedRoute>}>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/tasks" element={<TasksPage />} />
  <Route path="/chat" element={<ChatPage />} />
  <Route path="/colleagues" element={<ColleaguesPage />} />
  <Route path="/teams" element={<TeamsPage />} />
  <Route path="/teams/new" element={<CreateTeamPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

`/login`, `/privacy`, and `/terms` stay outside this block.

- [ ] **Step 4: Verify**

- Log in. Expected: sidebar renders, clicking each nav item changes both the URL and the highlighted item.
- Resize to 375px. Expected: sidebar disappears, bottom nav appears, no horizontal scrollbar on any route.
- Switch teams in the sidebar dropdown, then refresh. Expected: the same team is still selected.
- Log in as a user with no teams. Expected: redirected to `/teams/new`.

- [ ] **Step 5: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add responsive app shell and workspace switching"
```

---

### Task 5: Teams

**Files:**
- Rewrite: `frontend/src/pages/TeamsPage.jsx`, `frontend/src/pages/CreateTeamPage.jsx`

**Interfaces:**
- Consumes: `api`, `getErrorMessage`, `useWorkspace`, `useAuth`, `EmptyState`, `Field`, `Spinner`, `Avatar`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Write TeamsPage**

Match `design/teams_directory/screen.png`. A responsive card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) over `useWorkspace().workspaces`.

Each card shows the team name, a `PERSONAL` or `ORGANIZATION` chip, the owner via `<Avatar>`, an "Open" button calling `selectWorkspace(id)` then `navigate('/')`, and a delete button shown only when `workspace.owner.id === user.id`.

Delete asks for confirmation in a `<Modal>`, calls `DELETE /workspaces/{id}`, then `refresh()`.

Empty state: `<EmptyState>` with title "No teams yet" and an action button to `/teams/new`.

- [ ] **Step 2: Write CreateTeamPage**

Match `design/create_new_team/screen.png`. Form with name (required, max 100), description (optional textarea), and type as a two-option radio group defaulting to `ORGANIZATION`.

On submit: `POST /workspaces` with `{name, description, type}`, then `selectWorkspace(response.data.id)`, then `refresh()`, then `navigate('/')`.

Validation, spinner-on-submit, and server error alert follow the same pattern as LoginPage.

- [ ] **Step 3: Verify**

- Create a team called "Test Team" of type ORGANIZATION. Expected: redirected to the dashboard with "Test Team" selected in the sidebar.
- Visit `/teams`. Expected: the new team appears; a second team can be created and switched between.
- Submit the form with an empty name. Expected: inline error, no request sent.
- Delete a team you own. Expected: confirmation modal, then it disappears from the list.

- [ ] **Step 4: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add teams directory and create team screens"
```

---

### Task 6: Tasks board

**Files:**
- Rewrite: `frontend/src/pages/TasksPage.jsx`
- Create: `frontend/src/features/tasks/TaskCard.jsx`, `frontend/src/features/tasks/TaskFormModal.jsx`, `frontend/src/features/tasks/useTasks.js`

**Interfaces:**
- Consumes: `api`, `getErrorMessage`, `useWorkspace`, `Modal`, `Field`, `Avatar`, `Spinner`, `EmptyState`
- Produces: `useTasks(workspaceId) -> { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask }`. **Task 7 and Task 8 both consume `tasks` from this hook**, so the shape is `TaskResponse[]` exactly as the API returns it, with no client-side renaming.

- [ ] **Step 1: Write the useTasks hook**

Create `frontend/src/features/tasks/useTasks.js`. `moveTask` updates optimistically and rolls back on failure, which is what makes drag and drop feel instant:

```js
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

export function useTasks(workspaceId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/tasks/workspace/${workspaceId}`);
      setTasks(response.data);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTask = useCallback(
    async (payload) => {
      const response = await api.post(`/tasks/workspace/${workspaceId}`, payload);
      setTasks((previous) => [...previous, response.data]);
    },
    [workspaceId],
  );

  const updateTask = useCallback(async (taskId, payload) => {
    const response = await api.put(`/tasks/${taskId}`, payload);
    setTasks((previous) => previous.map((task) => (task.id === taskId ? response.data : task)));
  }, []);

  const moveTask = useCallback(
    async (taskId, status) => {
      const snapshot = tasks;
      setTasks((previous) =>
        previous.map((task) => (task.id === taskId ? { ...task, status } : task)),
      );
      try {
        const response = await api.patch(`/tasks/${taskId}/status`, { status });
        setTasks((previous) =>
          previous.map((task) => (task.id === taskId ? response.data : task)),
        );
      } catch (requestError) {
        setTasks(snapshot);
        throw requestError;
      }
    },
    [tasks],
  );

  const removeTask = useCallback(async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    setTasks((previous) => previous.filter((task) => task.id !== taskId));
  }, []);

  return { tasks, loading, error, reload, createTask, updateTask, moveTask, removeTask };
}
```

- [ ] **Step 2: Write TaskCard**

Create `frontend/src/features/tasks/TaskCard.jsx`. Props: `{ task, onEdit, onDelete, onMove }`.

Renders the priority chip (`HIGH` rose, `MEDIUM` amber, `LOW` zinc), the title, a two-line clamped description, the assignee `<Avatar>`, and a menu button. Cards in `DONE` get `line-through` on the title, matching the mockup.

The card sets `draggable` and `onDragStart` writing `task.id` to `event.dataTransfer`.

The menu offers Edit, Delete, and "Move to" entries for the two statuses the task is not currently in. **This menu is the accessible and touch path** and must work without any drag gesture.

- [ ] **Step 3: Write TaskFormModal**

Create `frontend/src/features/tasks/TaskFormModal.jsx`. Props: `{ open, onClose, onSubmit, task }`.

One form used for both create and edit. When `task` is provided the fields are pre-filled and the title reads "Edit task", otherwise "New task". Fields: title (required, max 150), description (textarea, max 40000), priority (select, defaults to `MEDIUM`). Assignee is omitted; there is no endpoint to list workspace members to populate it, and sending an invalid `assigneeId` would fail.

- [ ] **Step 4: Write TasksPage**

Match `design/task_management_board_updated_logo/screen.png` and `design/tasks_mobile/screen.png` as one component.

Three columns from `['TODO', 'DOING', 'DONE']`, each with its label, a live count, and a `+` button opening the create modal pre-set to that status. Grid is `grid-cols-1 md:grid-cols-3` so mobile stacks the columns.

Each column is a drop target: `onDragOver` calls `preventDefault()`, `onDrop` reads the id and calls `moveTask(id, status)`. Wrap the call so a rejected move surfaces an error banner rather than an unhandled rejection.

Handle loading (spinner), error (message plus a Retry button calling `reload`), and empty (an `<EmptyState>` inside the TO-DO column).

- [ ] **Step 5: Verify**

- Create a task. Expected: it appears in TO-DO immediately.
- Drag it to DOING, then refresh the page. Expected: it is still in DOING, so the change reached the server.
- Use the card menu "Move to Done" on a touch-sized viewport. Expected: same result without dragging.
- Edit a task's title and priority. Expected: the card updates.
- Delete a task. Expected: it disappears and stays gone after refresh.
- Stop the backend, then drag a card. Expected: the card snaps back to its original column and an error message appears. Console clean.

- [ ] **Step 6: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add kanban task board with optimistic status moves"
```

---

### Task 7: Dashboard statistics

**Files:**
- Create: `frontend/src/lib/stats.js`, `frontend/src/lib/stats.test.js`
- Rewrite: `frontend/src/features/dashboard/StatsDashboard.jsx`, `frontend/src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `useTasks` from Task 6, `useWorkspace`, `EmptyState`, `Spinner`, `Avatar`
- Produces: `computeStats(tasks, days) -> { total, completed, inProgress, todo, activeColleagues, completionTrend, recentActivity }` where `completionTrend` is `[{ label, completed }]` and `recentActivity` is `TaskResponse[]` sorted by `updatedAt` descending, capped at 6.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/stats.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { computeStats } from './stats';

const task = (overrides) => ({
  id: crypto.randomUUID(),
  title: 'Task',
  status: 'TODO',
  priority: 'MEDIUM',
  assignee: null,
  creator: null,
  createdAt: '2026-07-30T10:00:00',
  updatedAt: '2026-07-30T10:00:00',
  ...overrides,
});

describe('computeStats', () => {
  it('counts tasks by status', () => {
    const result = computeStats([
      task({ status: 'TODO' }),
      task({ status: 'DOING' }),
      task({ status: 'DONE' }),
      task({ status: 'DONE' }),
    ]);

    expect(result.total).toBe(4);
    expect(result.todo).toBe(1);
    expect(result.inProgress).toBe(1);
    expect(result.completed).toBe(2);
  });

  it('counts distinct assignees as active colleagues', () => {
    const alice = { id: 'a', firstName: 'Alice', lastName: 'A' };
    const bob = { id: 'b', firstName: 'Bob', lastName: 'B' };
    const result = computeStats([
      task({ assignee: alice }),
      task({ assignee: alice }),
      task({ assignee: bob }),
      task({ assignee: null }),
    ]);

    expect(result.activeColleagues).toBe(2);
  });

  it('returns one trend bucket per day', () => {
    const result = computeStats([], 7);
    expect(result.completionTrend).toHaveLength(7);
    expect(result.completionTrend.every((bucket) => bucket.completed === 0)).toBe(true);
  });

  it('buckets completed tasks by the day they were updated', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = computeStats(
      [task({ status: 'DONE', updatedAt: `${today}T09:00:00` })],
      7,
    );
    const last = result.completionTrend[result.completionTrend.length - 1];

    expect(last.completed).toBe(1);
  });

  it('handles an empty task list without throwing', () => {
    const result = computeStats([]);
    expect(result.total).toBe(0);
    expect(result.activeColleagues).toBe(0);
    expect(result.recentActivity).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && npm test
```

Expected: FAIL, cannot resolve `./stats`.

- [ ] **Step 3: Write stats.js**

Create `frontend/src/lib/stats.js`:

```js
function dayKey(value) {
  return String(value).slice(0, 10);
}

function lastDays(count) {
  const days = [];
  const today = new Date();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function labelFor(key, count) {
  const date = new Date(`${key}T00:00:00`);
  if (count <= 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function computeStats(tasks = [], days = 7) {
  const byStatus = { TODO: 0, DOING: 0, DONE: 0 };
  const assignees = new Set();
  const completedPerDay = new Map();

  for (const task of tasks) {
    if (byStatus[task.status] !== undefined) byStatus[task.status] += 1;
    if (task.assignee?.id) assignees.add(task.assignee.id);
    if (task.status === 'DONE' && task.updatedAt) {
      const key = dayKey(task.updatedAt);
      completedPerDay.set(key, (completedPerDay.get(key) ?? 0) + 1);
    }
  }

  const completionTrend = lastDays(days).map((key) => ({
    label: labelFor(key, days),
    completed: completedPerDay.get(key) ?? 0,
  }));

  const recentActivity = [...tasks]
    .filter((task) => task.updatedAt)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 6);

  return {
    total: tasks.length,
    todo: byStatus.TODO,
    inProgress: byStatus.DOING,
    completed: byStatus.DONE,
    activeColleagues: assignees.size,
    completionTrend,
    recentActivity,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && npm test
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Rewrite StatsDashboard**

Rewrite `frontend/src/features/dashboard/StatsDashboard.jsx` completely. Props: `{ tasks }`.

**Delete every hardcoded value in the current file** (`'1,284'`, `'942'`, `'12'`, `mock7DaysData`, `mock30DaysData`, `mockMobileBarData`, the Sarah/John/Beta Launch activity entries, the Unsplash avatar URLs) and the `axios` call to `/stats/summary`.

Structure, as one responsive tree:
- A `range` state of `7 | 30`, with a toggle matching the mockup's "7 Days / 30 Days" pill pair.
- `const stats = useMemo(() => computeStats(tasks, range), [tasks, range]);`
- Three stat cards in `grid-cols-1 md:grid-cols-3`: Total Tasks, Completed Tasks, Active Colleagues, reading `stats.total`, `stats.completed`, `stats.activeColleagues`.
- Below, `grid-cols-1 lg:grid-cols-3`: the chart spans `lg:col-span-2`, Recent Activity fills the last column.
- The chart is a recharts `<AreaChart>` over `stats.completionTrend` with `dataKey="completed"`, inside `<ResponsiveContainer>` in a `h-64 md:h-72` wrapper. One chart at both sizes, not the previous area-plus-bar pair.
- Recent Activity lists `stats.recentActivity`, each row showing `<Avatar user={task.assignee ?? task.creator} />`, the task title, its status, and a relative timestamp. Empty list renders `<EmptyState>` with "No activity yet".

The percentage badges from the mockup (`+12%`, `+8%`, `Stable`) are dropped. There is no historical data to compute a real trend against, and inventing one reintroduces exactly the fake numbers this task removes.

- [ ] **Step 6: Wire DashboardPage**

Rewrite `frontend/src/pages/DashboardPage.jsx`: read `current` from `useWorkspace()`, call `useTasks(current?.id)`, handle loading and error, and render the header ("Analytics Overview" plus the subtitle from the mockup) and `<StatsDashboard tasks={tasks} />`. Leave a placeholder `<div>` where the Import and Export buttons go; Task 8 fills it.

- [ ] **Step 7: Verify**

- With 4 tasks, 2 of them DONE. Expected: Total Tasks reads 4 and Completed Tasks reads 2.
- Move a task to DONE on `/tasks`, then return to `/`. Expected: Completed Tasks increased by one and today's bar in the chart went up by one.
- Delete all tasks. Expected: all zeros, the chart renders a flat line, Recent Activity shows the empty state. No crash, console clean.
- Toggle 7 Days and 30 Days. Expected: the x-axis changes from weekday names to day-and-month.

- [ ] **Step 8: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): compute dashboard stats from real tasks and drop mock data"
```

---

### Task 8: CSV export and import

**Files:**
- Create: `frontend/src/lib/csv.js`, `frontend/src/lib/csv.test.js`
- Modify: `frontend/src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `useTasks` (`createTask`, `reload`), `getErrorMessage`
- Produces: `tasksToCsv(tasks) -> string`, `parseTasksCsv(text) -> { rows, errors }`, `downloadFile(filename, content, mimeType) -> void`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/csv.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { tasksToCsv, parseTasksCsv } from './csv';

describe('tasksToCsv', () => {
  it('writes a header row and one row per task', () => {
    const csv = tasksToCsv([
      { title: 'First', description: 'A', status: 'TODO', priority: 'HIGH' },
      { title: 'Second', description: 'B', status: 'DONE', priority: 'LOW' },
    ]);
    const lines = csv.trim().split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('title,description,status,priority');
  });

  it('quotes values containing commas or quotes', () => {
    const csv = tasksToCsv([
      { title: 'Fix, urgently', description: 'He said "no"', status: 'TODO', priority: 'LOW' },
    ]);

    expect(csv).toContain('"Fix, urgently"');
    expect(csv).toContain('"He said ""no"""');
  });
});

describe('parseTasksCsv', () => {
  it('reads rows back out', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\nFirst,A,TODO,HIGH\n',
    );

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { title: 'First', description: 'A', status: 'TODO', priority: 'HIGH' },
    ]);
  });

  it('survives a round trip through tasksToCsv', () => {
    const original = [
      { title: 'Fix, urgently', description: 'He said "no"', status: 'DOING', priority: 'HIGH' },
    ];
    const { rows } = parseTasksCsv(tasksToCsv(original));

    expect(rows).toEqual(original);
  });

  it('reports rows with a missing title instead of importing them', () => {
    const { rows, errors } = parseTasksCsv(
      'title,description,status,priority\n,A,TODO,HIGH\nGood,B,TODO,LOW\n',
    );

    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('2');
  });

  it('defaults an unknown priority to MEDIUM', () => {
    const { rows } = parseTasksCsv('title,description,status,priority\nA,,TODO,URGENT\n');
    expect(rows[0].priority).toBe('MEDIUM');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && npm test
```

Expected: FAIL, cannot resolve `./csv`.

- [ ] **Step 3: Write csv.js**

Create `frontend/src/lib/csv.js`:

```js
const COLUMNS = ['title', 'description', 'status', 'priority'];
const STATUSES = ['TODO', 'DOING', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function escapeCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function tasksToCsv(tasks = []) {
  const header = COLUMNS.join(',');
  const rows = tasks.map((task) => COLUMNS.map((key) => escapeCell(task[key])).join(','));
  return [header, ...rows].join('\n');
}

function splitLine(line) {
  const cells = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

export function parseTasksCsv(text = '') {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const rows = [];
  const errors = [];

  if (lines.length === 0) return { rows, errors };

  const header = splitLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const indexOf = (name) => header.indexOf(name);

  if (indexOf('title') === -1) {
    errors.push('The file needs a "title" column.');
    return { rows, errors };
  }

  for (let line = 1; line < lines.length; line += 1) {
    const cells = splitLine(lines[line]);
    const read = (name) => {
      const position = indexOf(name);
      return position === -1 ? '' : (cells[position] ?? '').trim();
    };

    const title = read('title');
    if (!title) {
      errors.push(`Row ${line + 1} was skipped because it has no title.`);
      continue;
    }

    const status = read('status').toUpperCase();
    const priority = read('priority').toUpperCase();

    rows.push({
      title,
      description: read('description'),
      status: STATUSES.includes(status) ? status : 'TODO',
      priority: PRIORITIES.includes(priority) ? priority : 'MEDIUM',
    });
  }

  return { rows, errors };
}

export function downloadFile(filename, content, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && npm test
```

Expected: PASS, all stats and csv tests green.

- [ ] **Step 5: Wire the buttons into DashboardPage**

Replace the placeholder from Task 7 step 6 with an Export button and an Import button, styled per the mockup.

Export: `downloadFile('team-pulse-tasks.csv', tasksToCsv(tasks))`.

Import: a hidden `<input type="file" accept=".csv">` triggered by the button. On change, read the file with `text()`, run `parseTasksCsv`, then `POST` each row through `createTask`. `status` is not accepted by `TaskCreateRequest`, so any row not in `TODO` needs a follow-up `moveTask(id, status)`; simplest correct approach is to create the task, then call `PATCH /tasks/{id}/status` when the parsed status is not `TODO`.

Show a result summary afterwards: how many were imported, and any `errors` returned by the parser. Reset the file input's value so the same file can be picked twice.

- [ ] **Step 6: Verify**

- Click Export with 3 tasks present. Expected: `team-pulse-tasks.csv` downloads with a header and 3 rows.
- Import that same file. Expected: 3 new tasks appear and the dashboard totals double.
- Create a task titled `Fix, urgently` containing a quote, export, and re-import. Expected: the title round-trips exactly.
- Import a CSV with a blank title row. Expected: that row is reported as skipped and the others still import.

- [ ] **Step 7: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add client-side csv export and import for tasks"
```

---

### Task 9: Colleagues

**Files:**
- Rewrite: `frontend/src/pages/ColleaguesPage.jsx`

**Interfaces:**
- Consumes: `api`, `getErrorMessage`, `useWorkspace`, `useAuth`, `useTasks`, `Avatar`, `Modal`, `Field`, `EmptyState`, `Spinner`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Build the roster**

There is no `GET /workspaces/{id}/members` endpoint and `WorkspaceResponse` carries only `owner`. Derive the roster in the page:

```js
function buildRoster(workspace, tasks) {
  const people = new Map();
  if (workspace?.owner) people.set(workspace.owner.id, { user: workspace.owner, role: 'OWNER' });
  for (const task of tasks) {
    for (const person of [task.assignee, task.creator]) {
      if (person?.id && !people.has(person.id)) {
        people.set(person.id, { user: person, role: 'MEMBER' });
      }
    }
  }
  return [...people.values()];
}
```

Render a note under the page heading, in plain UI copy: `Showing the team owner and everyone with tasks here. A member with no tasks yet will appear once they create or are assigned one.` This is honest about the limitation rather than hiding it.

- [ ] **Step 2: Build the page**

Match `design/teams_directory/screen.png` for the card treatment. Responsive grid of member cards: `<Avatar size={40} />`, full name, email, role chip, and a Remove button (hidden for the owner and for yourself).

Add member: a button opens a `<Modal>` containing a search field. Typing calls `GET /users/search?email=<query>`, debounced by 300ms. Results list each user with an Add button; adding calls `POST /workspaces/{current.id}/members` with `{ email, role: 'MEMBER' }` and then `reload()` on the tasks hook so the roster refreshes.

Remove calls `DELETE /workspaces/{current.id}/members/{encodeURIComponent(email)}`.

- [ ] **Step 3: Verify**

- Open `/colleagues`. Expected: you appear as OWNER of a team you created.
- Search for a teammate's email in the add modal. Expected: results appear after you stop typing, not on every keystroke.
- Add them, then have them create a task in the team. Expected: they show up in the roster.
- Search a string matching nobody. Expected: "No users found", no crash.

- [ ] **Step 4: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add colleagues roster with member search, add and remove"
```

---

### Task 10: Settings, GDPR and legal pages

**Files:**
- Rewrite: `frontend/src/pages/SettingsPage.jsx`, `frontend/src/pages/PrivacyPage.jsx`, `frontend/src/pages/TermsPage.jsx`

**Interfaces:**
- Consumes: `api`, `getErrorMessage`, `useAuth`, `useWorkspace`, `downloadFile` from `lib/csv.js`, `validatePassword`, `Field`, `Modal`, `Avatar`, `Spinner`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Build the settings sections**

Match `design/user_settings_updated_logo/screen.png` and `design/settings_mobile/screen.png` as one component. Four cards stacked in a single column, capped at `max-w-2xl`.

**Profile:** first name, last name, avatar URL. Submits `PUT /users/profile` with `{firstName, lastName, avatarUrl}`, then calls `refreshUser()` so the header avatar updates immediately. Label the avatar field `Avatar image URL` with the hint `Paste a link to an image. File upload is not supported by the API yet.`

**Password:** current password, new password, confirm new password. Validates with `validatePassword` and checks the two new values match before submitting `POST /users/change-password`.

**Your data:** a Download button building a JSON export in the browser:

```js
async function downloadMyData(user, workspaces) {
  const tasksByWorkspace = {};
  for (const workspace of workspaces) {
    const response = await api.get(`/tasks/workspace/${workspace.id}`);
    tasksByWorkspace[workspace.name] = response.data;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    teams: workspaces,
    tasks: tasksByWorkspace,
  };
  downloadFile('team-pulse-my-data.json', JSON.stringify(payload, null, 2), 'application/json');
}
```

**Delete account:** a destructive-styled button opening a `<Modal>` that requires typing `DELETE` to enable confirmation. On confirm, `DELETE /users/me`, then `logout()`, then navigate to `/login`.

- [ ] **Step 2: Write the legal pages**

`PrivacyPage.jsx` and `TermsPage.jsx` are static, readable documents in a `max-w-3xl` container, each with a heading, a last-updated line, and a back link. They render outside `AppLayout` so they are reachable when logged out, since the login card links to them.

Privacy must state what is collected (name, email, avatar URL, tasks, messages), why, that data lives in the project's own PostgreSQL database, and that the user can export or delete everything from Settings. Terms covers acceptable use and the fact that this is a student project with no warranty. Keep both plain and honest. No em dashes.

- [ ] **Step 3: Verify**

- Change your first name. Expected: saves, and the sidebar name updates without a reload.
- Set an avatar URL to any public image. Expected: the header avatar changes.
- Change your password to something failing the rule. Expected: inline error, no request.
- Change it correctly, log out, log in with the new password. Expected: works.
- Click Download my data. Expected: a JSON file containing your profile, teams and tasks.
- Open the delete modal. Expected: Confirm is disabled until `DELETE` is typed exactly.
- Visit `/privacy` and `/terms` while logged out. Expected: both render.

- [ ] **Step 4: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): add settings, gdpr data export, account deletion and legal pages"
```

---

### Task 11: Chat integration

**Files:**
- Create (copied from `origin/aarab`): `frontend/src/features/chat/**`, `frontend/src/infrastructure/socket/SocketClient.js`
- Rewrite: `frontend/src/pages/ChatPage.jsx`

**Interfaces:**
- Consumes: `useAuth`; `SocketProvider` and `ChatLayout` from `features/chat`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Copy aarab's module byte-for-byte**

```bash
cd /Users/szemmouri/Desktop/ft_transcendence
git checkout origin/aarab -- frontend/src/features/chat frontend/src/infrastructure/socket
rm frontend/src/features/chat/INTEGRATION_EXAMPLE.jsx
```

`git checkout <ref> -- <path>` copies the files exactly as they are on aarab's branch, so git sees identical blobs and merges cleanly later. `INTEGRATION_EXAMPLE.jsx` is reference material, not application code, and it is the one file that must not ship.

Do not edit any file under these two directories. If something needs changing, note it in the README as a request for aarab instead.

- [ ] **Step 2: Write ChatPage**

Rewrite `frontend/src/pages/ChatPage.jsx`:

```jsx
import { useCallback } from 'react';
import { SocketProvider, ChatLayout } from '../features/chat';
import { getToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ChatPage() {
  const { user } = useAuth();
  const getTokenValue = useCallback(() => getToken(), []);

  return (
    <SocketProvider getToken={getTokenValue}>
      <div className="h-[calc(100vh-13rem)] md:h-[calc(100vh-9rem)]">
        <ChatLayout currentUserId={user.id} />
      </div>
    </SocketProvider>
  );
}
```

The height wrapper accounts for the header and the mobile bottom nav so the message list scrolls inside the chat rather than the page scrolling.

- [ ] **Step 3: Confirm the copy is untouched**

```bash
git diff origin/aarab -- frontend/src/features/chat frontend/src/infrastructure/socket
```

Expected: the only difference is the deleted `INTEGRATION_EXAMPLE.jsx`. Any other diff means a file was edited and must be restored.

- [ ] **Step 4: Verify**

- Visit `/chat`. Expected: the chat layout renders with its room sidebar, and the app shell around it still works.
- Expected and acceptable for now: requests fail with 401 because the Java JWT has no `id` claim. The UI must show its error state, not a blank screen or an unhandled exception. Note the exact behaviour observed for the README.
- Resize to 375px. Expected: aarab's master-detail mobile view takes over, no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): mount aarab's chat module in the app shell"
```

---

### Task 12: Polish and README

**Files:**
- Create: `frontend/README.md`
- Modify: any file needing a fix found during the sweep

**Interfaces:**
- Consumes: everything
- Produces: the README the user reads before their evaluation

- [ ] **Step 1: Sweep for leftovers**

```bash
cd frontend
EXCL="--exclude-dir=chat --exclude-dir=socket"
grep -rn $EXCL "console\.\|TODO\|FIXME" src || echo "clean"
grep -rn $EXCL "—" src || echo "no em dashes"
grep -rn $EXCL "unsplash\|1,284\|942\|mock" src || echo "no mock data"
```

Expected: all three report clean. Fix anything they surface.

The exclusions cover `src/features/chat/` and `src/infrastructure/socket/`, which are aarab's vendored files and must not be edited.

- [ ] **Step 2: Verify comments were never added**

```bash
grep -rn "^\s*//\|^\s*/\*" src --include=*.jsx --include=*.js | grep -v "src/features/chat\|src/infrastructure/socket"
```

Expected: no output. aarab's copied files are excluded because they must stay byte-for-byte identical.

- [ ] **Step 3: Full manual pass**

Run through every route at 375px and 1440px with the console open:

- [ ] `/login` both tabs, `/privacy`, `/terms`
- [ ] `/` dashboard with tasks and with zero tasks
- [ ] `/tasks` create, edit, drag, menu-move, delete
- [ ] `/chat`
- [ ] `/colleagues` search and add
- [ ] `/teams`, `/teams/new`
- [ ] `/settings` all four sections

Confirm: no console output anywhere, no horizontal scrollbar anywhere, every button either does something or is not there.

- [ ] **Step 4: Run the build and tests**

```bash
cd frontend && npm run lint && npm test && npm run build
```

Expected: lint clean, tests pass, build succeeds.

- [ ] **Step 5: Write the README**

Create `frontend/README.md`, written so the user can read it once and then explain the whole frontend from memory. Sections:

1. **What this is** and how to run it (`npm install`, `.env` from `.env.example`, `npm run dev`), plus what must be running for it to work (the Java backend on 8080; the chat backend on 5005 for the chat page only).
2. **Folder map**, one line per folder, in the order a reader should follow: `lib` then `context` then `components` then `pages` then `features`.
3. **How login works**, following the token end to end: form to `POST /auth/login` to `localStorage.token` to the axios interceptor to every request; and how a 401 sends you back to the login page. State plainly that the key is named `token` because aarab's chat module reads that exact key.
4. **How the dashboard gets its numbers**, stating clearly that there is no stats endpoint and the figures are counted from the real task list by `lib/stats.js`, which has tests. This is the question most likely to be asked.
5. **Which code is whose**: `features/chat/` and `infrastructure/socket/` are aarab's, copied unchanged; everything else is the user's.
6. **Known issues, with fixes**, stated in the open:
   - Chat returns 401 because the Java JWT has no `id` claim. Fix belongs to mdbentaleb, in `JwtUtils.generateToken`: add the user id to `extraClaims` before building the token. Until then the chat UI renders but cannot load rooms.
   - There is no `GET /workspaces/{id}/members`, so Colleagues derives the roster from the team owner plus everyone with a task. Adding that endpoint would make it exact.
   - No avatar upload endpoint, so Settings takes an image URL.
   - `TaskCommentController` is mapped at `/api/v1` while the app already sets that as the context path, so its real paths are doubled. Not used by any screen.
7. **The two backends** and the three environment variables, and why `VITE_API_URL` was left pointing at the chat service.

Keep it plain. No em dashes.

- [ ] **Step 6: Commit**

```bash
git add -A frontend
git commit -m "docs(frontend): add readme covering architecture, data flow and known issues"
```

---

## Self-review notes

Spec coverage check against `2026-08-01-frontend-team-pulse-design.md`:

| Spec section | Covered by |
|---|---|
| 4 Folder layout | Tasks 1, 2, 4 |
| 4 Network layer, env vars | Task 2 |
| 4 Auth, workspace selection | Tasks 3, 4 |
| 5 Login | Task 3 |
| 5 Dashboard | Tasks 7, 8 |
| 5 Tasks | Task 6 |
| 5 Colleagues | Task 9 |
| 5 Settings, GDPR, legal | Task 10 |
| 5 Chat | Task 11 |
| 5 Teams | Task 5 |
| 6 Styling | Global Constraints, applied per screen |
| 7 Cleanup | Task 1 |
| 8 Error handling | Global Constraints, verified in Task 12 |
| 9 Testing | Tasks 7, 8 (vitest on pure functions), Task 12 (manual pass) |
| 10 Deliverable README | Task 12 |

Deviation from the spec worth flagging to the user: section 9 said a test runner was out of scope. This plan adds `vitest` and tests `lib/stats.js` and `lib/csv.js` only, because those are the two pieces of real logic and the spec anticipated testing them. It is one devDependency and two files. Drop Task 7 steps 1, 2, 4 and Task 8 steps 1, 2, 4 if it is not wanted.
