# Frontend Issues & Feature Requirements

## 1. UI & Responsiveness

### Task Details Overflow
- **Problem:** Tasks with long descriptions break the layout. The description text overflows and expands the container past the screen viewport without scaling responsively.

---

## 2. Profile & Media

### Uploaded Avatar Not Displaying
- **Problem:** Uploading an avatar successfully stores the file in MinIO and updates the image URL in the `users` database table, but the profile UI fails to display the image.

---

## 3. Authentication & Token Management

### Silent Token Refresh
- **Problem:** Users are logged out immediately whenever the 15-minute Access Token expires.
- **Expected Behavior:** Implement an HTTP interceptor (Axios/Fetch) to handle 401 responses. When the access token expires, automatically request a new one via the `/auth/refresh` endpoint in the background. Only redirect the user to `/login` if the Refresh Token itself is expired or invalid.

---

## 4. Email Verification & Unverified Login Flow

Unverified users attempting login are blocked by an "account disabled" error with no modal or option provided to enter a verification code.

what should be:


### Step 1: Login Attempt (`POST /auth/login`)

When calling `/auth/login`:

- **If verified (`200 OK`):** Store the tokens and navigate to `/dashboard`.
- **If unverified (`403 Forbidden`):**
  1. Catch the `403` status (check for `errorCode: "EMAIL_NOT_VERIFIED"` or `"Account is disabled"` in the response message).
  2. Save the user's `email` in your application state.
  3. Automatically display the **Verification Code Modal/Page**.
  4. Show an info toast: *"Your account is not verified yet. A new verification code has been sent to your email."*


### Step 2: Submit Verification Code (`POST /auth/verify-email`)

When the user inputs the 6-digit code in the modal and clicks **Verify**:

- **Endpoint:** `POST /auth/verify-email`
- **Payload:**
```json
  {
    "email": "user@example.com",
    "code": "123456"
  }

```

### Step 3: Handling Success & Auto-Login (`200 OK`)

When `/auth/verify-email` returns `200 OK`, the response payload includes the complete authentication session:

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "447b7a2d-...",
  "tokenType": "Bearer",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@example.com",
    "firstName": "Mohamed",
    "lastName": "..."
  }
}

```

### Required Actions:

1. Save `accessToken` & `refreshToken` in `localStorage` / Auth Context.
2. Close the verification modal.
3. **Auto-login:** Redirect the user directly to `/dashboard` or `/workspaces`. **Do NOT redirect them to the login page.**



### Step 4: Handling Code Errors (`400 Bad Request` / `401 Unauthorized`)

If the user submits an incorrect or expired code:

1. Keep the verification modal open.
2. Display an inline error message: *"Invalid or expired verification code. Please try again."*
3. Keep the **Resend Code** button active.



### Step 5: Resend Verification Code (`POST /auth/resend-verification`)

If the user clicks **"Resend Code"**:

* **Endpoint:** `POST /auth/resend-verification`
* **Payload:**
```json
{
  "email": "user@example.com"
}

```


* **UX Requirement:** Disable the "Resend Code" button for a 60-second cooldown timer after each click to prevent excessive requests.


---

## 5. Third-Party Auth

### Google OAuth Integration
- **Problem:** The frontend is missing Google Sign-In / Sign-Up UI controls.
- **Expected Behavior:** Add a **"Continue with Google"** button on both the Login and Signup pages and wire it to the backend Google OAuth flow (`/auth/google`).
