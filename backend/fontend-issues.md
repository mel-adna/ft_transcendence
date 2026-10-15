
# Bug Report: 401 Unauthorized on `POST /api/chat/notify`

**Target Assignee:** Front-End Developer  
**Affected Component:** `ColleaguesPage.jsx` / `realtimeNotify.js`

---

## 1. Issue Summary
When removing a workspace member from the Colleagues page, the browser console logs a `401 Unauthorized` HTTP error:

```text
POST https://localhost/api/chat/notify 401 (Unauthorized)
at realtimeNotify.js:11
at ColleaguesPage.jsx:221

```

---

## 2. Root Cause Analysis

1. **Missing Authorization Header:** The `realtimeNotify` function sends a `POST` request to `/api/chat/notify` without attaching the required `Authorization: Bearer <access_token>` header.
2. **Redundant Frontend Event Dispatch:** The Spring Boot backend already fires a `WorkspaceMemberRemovedEvent` upon calling `DELETE /api/v1/workspaces/{id}/members/{memberId}`, which publishes the real-time event directly through Redis Pub/Sub to WebSockets. Triggering `/api/chat/notify` manually from React is unnecessary.

---

## 3. Resolution Steps

### Option A: Remove Redundant Call (Recommended)

Since the backend publishes WebSocket events automatically, remove the `realtimeNotify` call inside `ColleaguesPage.jsx`:

```javascript
// ColleaguesPage.jsx
const handleRemoveMember = async (memberId) => {
  try {
    // 1. Backend handles DB removal + WebSocket notification automatically
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);

    // ❌ REMOVE OR COMMENT OUT THIS LINE:
    // await realtimeNotify({ action: 'MEMBER_REMOVED', memberId }); 

    toast.success("Member removed successfully");
    fetchMembers();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to remove member");
  }
};

```

---

### Option B: Attach Bearer Token (If manual notification is required)

If client-side notification dispatch is intentionally required, update `realtimeNotify.js` to include the stored JWT token:

```javascript
// realtimeNotify.js
export const realtimeNotify = async (payload) => {
  const token = localStorage.getItem('accessToken'); // Adjust key to match your token storage

  try {
    const response = await fetch('/api/chat/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Realtime notification failed with status ${response.status}`);
    }
  } catch (err) {
    console.error('Realtime notification error:', err);
  }
};
```
