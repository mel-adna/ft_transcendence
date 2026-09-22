# Frontend Integration Workspace Invitation Workflow

## 1. Breaking Changes (DEPRECATED & REMOVED)

| Action | Old Endpoint | Status | Replacement |
| --- | --- | --- | --- |
| **Add Member Directly** | `POST /workspaces/{workspaceId}/members` | **REMOVED** | Use `POST /api/v1/workspaces/{workspaceId}/invitations` |

---

## 2. New & Updated Endpoints Summary

### Base URL: `/api/v1`

| Action | Method | Endpoint | Authorization |
| --- | --- | --- | --- |
| **Send Invitation** | `POST` | `/workspaces/{workspaceId}/invitations` | Workspace Admin |
| **Get Workspace Invitations** | `GET` | `/workspaces/{workspaceId}/invitations` | Workspace Admin |
| **Cancel/Revoke Invitation** | `DELETE` | `/workspaces/{workspaceId}/invitations/{invitationId}` | Workspace Admin |
| **Get Logged-in User's Invites** | `GET` | `/workspaces/users/me/invitations` | Authenticated User |
| **Accept Invitation** | `POST` | `/workspaces/invitations/{invitationId}/accept` | Authenticated User |
| **Reject Invitation** | `POST` | `/workspaces/invitations/{invitationId}/reject` | Authenticated User |
| **Remove Existing Member** | `DELETE` | `/workspaces/{workspaceId}/members/{memberEmail}` | Workspace Admin (Unchanged) |

---

## 3. Detailed Endpoint Specs & Payloads

### A. Admin Actions (Workspace Management)

#### 1. Send Invitation

* **Endpoint:** `POST /api/v1/workspaces/{workspaceId}/invitations`
* **Request Body:**

```json
{
  "email": "user@example.com",
  "role": "MEMBER" // Options: "ADMIN", "MEMBER"
}

```

* **Response (`201 Created`):**

```json
{
  "id": "ac68840e-0aa3-4dda-b36d-f9c144ffa3ef",
  "workspaceId": "d5cd16fe-1945-47a2-8520-bc21bd88a919",
  "workspaceName": "Med-Space",
  "inviterName": "Mohamed Bentaleb",
  "inviteeEmail": "user@example.com",
  "role": "MEMBER",
  "status": "PENDING",
  "createdAt": "2026-09-22T19:25:44.939Z",
  "expiresAt": "2026-09-29T19:25:44.936Z"
}

```

#### 2. Get Workspace Pending Invitations

* **Endpoint:** `GET /api/v1/workspaces/{workspaceId}/invitations`
* **Response (`200 OK`):** Array of `WorkspaceInvitationResponse` objects.

#### 3. Cancel/Revoke Pending Invitation

* **Endpoint:** `DELETE /api/v1/workspaces/{workspaceId}/invitations/{invitationId}`
* **Response (`204 No Content`)**

---

### B. User Actions (Invitation Response)

#### 4. Get My Pending Invitations

* **Endpoint:** `GET /api/v1/workspaces/users/me/invitations`
* **Response (`200 OK`):**

```json
[
  {
    "id": "ac68840e-0aa3-4dda-b36d-f9c144ffa3ef",
    "workspaceId": "d5cd16fe-1945-47a2-8520-bc21bd88a919",
    "workspaceName": "Med-Space",
    "inviterName": "Mohamed Bentaleb",
    "inviteeEmail": "user@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "createdAt": "2026-09-22T19:25:44.939Z",
    "expiresAt": "2026-09-29T19:25:44.936Z"
  }
]

```

#### 5. Accept Invitation

* **Endpoint:** `POST /api/v1/workspaces/invitations/{invitationId}/accept`
* **Response (`200 OK`)**
* *Note:* Once accepted, the user automatically becomes a member and appears in `GET /workspaces/{workspaceId}/members`.

#### 6. Reject Invitation

* **Endpoint:** `POST /api/v1/workspaces/invitations/{invitationId}/reject`
* **Response (`200 OK`)**

---

## 4. Frontend UI Integration Flow

1. **Admin Workspace Settings:**
* Replace the "Add Member" direct submit modal with an "Invite Member by Email" form.
* Add an "Invited / Pending Invitations" list next to current members with a "Cancel / Revoke" button calling `DELETE /workspaces/{workspaceId}/invitations/{invitationId}`.


2. **User Notification Header / Dashboard:**
* Fetch pending invites on app load using `GET /workspaces/users/me/invitations`.
* Display invitation card/badge showing `workspaceName`, `inviterName`, and buttons for **Accept** and **Reject**.