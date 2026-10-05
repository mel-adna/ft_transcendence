# Frontend Issues

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 39 | Socket client logs connection errors to console on every page | Floods console when chat-service is offline; causes evaluation rejection | Small |
| 42 | Unhandled 403 on `/invitations` when switching workspaces | Switching to a workspace where user is a MEMBER triggers GET /invitations and prints console error | Small |
| 43 | Missing `/signup` route and query parameter pre-fill from invitation links | Direct invitation links render a blank page and fail to auto-fill the invitee's email | Small |
| 44 | Handle paginated API response for `/tasks/workspace/{workspaceId}` | Response structure changed from flat array `Task[]` to Spring `Page<Task>` object | Small |

---

## 39. Socket client logs connection errors to console on every page

`src/infrastructure/socket/SocketClient.js` prints connection, disconnection, and error logs using `console.log` and `console.error`. Because the socket is kept open globally across all pages, when `chat-service` is down, repeated error messages flood the browser console on every page. According to 1337 school subject evaluation rules, console errors cause project rejection.

**Fix:** Wrap console output in `_bindLifecycleEvents()` inside an `import.meta.env.DEV` check.

```javascript
_bindLifecycleEvents() {
  const s = this._socket;

  s.on('connect', () => {
    if (import.meta.env.DEV) {
      console.log('[SocketClient] Connected:', s.id);
    }
    this._startHeartbeat();
  });

  s.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
      console.log('[SocketClient] Disconnected:', reason);
    }
    this._stopHeartbeat();
  });

  s.on('connect_error', (err) => {
    if (import.meta.env.DEV) {
      console.error('[SocketClient] Connection error:', err.message);
    }
    if (
      err.message === 'AUTH_MISSING_TOKEN' ||
      err.message === 'AUTH_TOKEN_INVALID' ||
      err.message === 'AUTH_TOKEN_EXPIRED'
    ) {
      s.disconnect();
    }
  });
}

```

---

## 42. Unhandled 403 on `/invitations` when switching active workspace on Colleagues page

When navigating the Colleagues / Members page, switching the active workspace via the top dropdown selector triggers an automatic fetch request for pending invitations:

```http
GET /api/v1/workspaces/{workspaceId}/invitations

```

If the user is a regular `MEMBER` (and not an `ADMIN`) in the newly selected workspace, the backend correctly rejects the request with HTTP 403 (`Only workspace ADMINs can perform this action!`).

Because the frontend dispatches this request blindly without checking the user's role in the target workspace first, an unhandled `403` error is printed in the browser console during normal UI navigation. This violates the subject requirements regarding clean browser consoles.

**Steps to Reproduce:**

1. Log in as an `ADMIN` in Workspace A, but a regular `MEMBER` in Workspace B.
2. Go to the Colleagues page in Workspace A (both members and invitations load successfully).
3. Switch the active workspace to Workspace B using the top dropdown selector.
4. Observe the `403 Forbidden` error in the browser DevTools Console.

**Expected Behavior:**
Check the user's role in the active workspace before dispatching the request to fetch pending invitations:

* If `role === 'ADMIN'`: Fetch both members and pending invitations.
* If `role === 'MEMBER'`: Fetch members only (do NOT call `/invitations`).

**Suggested Fix:**
In the `useEffect` or state listener handling workspace switching on the Colleagues page:

```javascript
useEffect(() => {
  if (!currentWorkspaceId) return;

  // 1. Fetch workspace members (allowed for all members)
  fetchWorkspaceMembers(currentWorkspaceId);

  // 2. Fetch invitations ONLY if the current user is an ADMIN in this specific workspace
  if (currentUserRoleInActiveWorkspace === 'ADMIN') {
    fetchPendingInvitations(currentWorkspaceId);
  }
}, [currentWorkspaceId, currentUserRoleInActiveWorkspace]);

```

---

## 43. Missing `/signup` route and email parameter pre-fill from invitation links

When a non-registered user receives a workspace invitation email containing an action link such as `https://localhost/signup?email=user@example.com`, clicking the link opens a blank screen.

**Why It Matters:**
Unregistered users invited to workspaces are unable to sign up via direct email links, resulting in broken onboarding flow and evaluation failure.

**Steps to Reproduce:**

1. Open an invitation email sent to an unregistered user email address.
2. Click the signup action link (`/signup?email=...`).
3. Observe a blank page rendered because React Router has no matching `/signup` route.

**Expected Behavior:**

* Navigating to `/signup` should render the authentication page.
* The UI tab should automatically activate the **Sign Up** mode.
* The `email` input field should automatically pre-fill with the value extracted from the `?email=` URL parameter.

**Fix:**

1. In `src/App.jsx`, add a route for `/signup` pointing to `LoginPage`:

```jsx
<Route element="{<LoginPage" path="/signup"/>} />

```

2. In `src/pages/LoginPage.jsx`, use `useLocation` and `useSearchParams` to detect the `/signup` path and extract `email`:

```jsx
import { useLocation, useSearchParams } from 'react-router-dom';

export default function LoginPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isSignupPath = location.pathname === '/signup' || searchParams.get('mode') === 'signup';
  const emailParam = searchParams.get('email') || '';

  const [mode, setMode] = useState(isSignupPath ? 'signup' : 'login');
  const [email, setEmail] = useState(emailParam);

  useEffect(() => {
    if (isSignupPath) setMode('signup');
    if (emailParam) setEmail(emailParam);
  }, [isSignupPath, emailParam]);

  // ... rest of component
}

```

---

## 44. Handle paginated API response for `/tasks/workspace/{workspaceId}`

To optimize database memory usage and response speed, the backend endpoint `GET /tasks/workspace/{workspaceId}` now returns a paginated Spring `Page<TaskResponse>` object instead of a flat array `Task[]`.

**Why It Matters:**
Directly rendering or mapping over the API response without extracting `.content` will cause JavaScript runtime errors (e.g., `tasks.map is not a function` or undefined state) on the Kanban board.

---

### Response Structure Changes

#### Old Response Format (Flat Array):
```json
[
  { "id": "123", "title": "Task 1", "status": "TODO" },
  { "id": "456", "title": "Task 2", "status": "IN_PROGRESS" }
]

```

#### New Response Format (Spring Page Object):

```json
{
  "content": [
    { "id": "123", "title": "Task 1", "status": "TODO" },
    { "id": "456", "title": "Task 2", "status": "IN_PROGRESS" }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 50
  },
  "totalPages": 3,
  "totalElements": 125,
  "last": false,
  "first": true,
  "size": 50,
  "number": 0,
  "empty": false
}

```

---

### Suggested Fixes

#### 1. In API Service Layer (`src/services/taskService.js` or `src/api/tasks.js`):

Extract `data.content` directly from the response so the UI state receives the array:

```javascript
export const fetchWorkspaceTasks = async (workspaceId, page = 0, size = 50) => {
  const response = await api.get(`/tasks/workspace/${workspaceId}`, {
    params: {
      page: page,
      size: size,
      sort: 'createdAt,desc'
    }
  });

  // Extract content array for existing components
  return response.data.content || [];
};

```

#### 2. In Kanban Board Component / State Management:

If handling raw Axios responses directly in React state, update state extraction:

```javascript
// ❌ Old Code
const loadTasks = async () => {
  const res = await api.get(`/tasks/workspace/${workspaceId}`);
  setTasks(res.data);
};

// ✅ New Fixed Code
const loadTasks = async () => {
  const res = await api.get(`/tasks/workspace/${workspaceId}`);
  setTasks(res.data.content || []);
};

```
