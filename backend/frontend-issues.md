Bug: 403 Forbidden console error on `/invitations` when switching active workspace on Colleagues page

### Description
When navigating the "Colleagues / Members" page, switching the active workspace via the top dropdown triggers an automatic fetch request for pending invitations (`GET /api/v1/workspaces/{workspaceId}/invitations`). If the user is a regular `MEMBER` (and not an `ADMIN`) in the newly selected workspace, the backend correctly rejects the request with HTTP 403 (`Only workspace ADMINs can perform this action!`).

This produces an unhandled `403` error in the browser console during normal UI navigation, which violates the subject requirements regarding clean browser consoles.

### Steps to Reproduce
1. Log in as a user who is an ADMIN in Workspace A, but a regular MEMBER in Workspace B.
2. Go to the "Colleagues" page in Workspace A (both members and invitations load successfully).
3. Switch the active workspace to Workspace B using the top dropdown selector.
4. Check the Network / Console tab in DevTools.

### Actual Behavior
The frontend immediately dispatches `GET /api/v1/workspaces/WORK_SPACE_B_ID/invitations` without checking the user's role in Workspace B, resulting in an HTTP 403 console error.

### Expected Behavior
Before dispatching the request to fetch pending invitations, the frontend should check the user's role in the newly active workspace:
- If `role === 'ADMIN'`: Fetch both members and pending invitations.
- If `role === 'MEMBER'`: Fetch members only (do NOT call `/invitations`).

### Suggested Fix
In the `useEffect` / state listener handling workspace switching on the Colleagues page:

```javascript
// Example check before dispatching the invitation request
useEffect(() => {
  if (!currentWorkspaceId) return;

  // 1. Fetch workspace members (allowed for all members)
  fetchWorkspaceMembers(currentWorkspaceId);

  // 2. Fetch invitations ONLY if the current user is an ADMIN in this specific workspace
  if (currentUserRoleInActiveWorkspace === 'ADMIN') {
    fetchPendingInvitations(currentWorkspaceId);
  }
}, [currentWorkspaceId, currentUserRoleInActiveWorkspace]);