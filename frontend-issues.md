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

## 4. Email Verification Flows

### Unverified User Login Handling
- **Problem:** If a user signs up and leaves the verification page, attempting to log in later returns a "disabled/unverified email" error without providing any way to complete verification.
- **Expected Behavior:** 
  1. When a user attempts to log in with an unverified account, catch the unverified error response.
  2. Automatically trigger the backend endpoint to resend a fresh verification code.
  3. Redirect the user directly to the Verification Modal/Page instead of keeping them stuck on the login form.

### Resend Verification Code Button
- **Problem:** The verification modal lacks a button to request a new code if the original email fails or expires.
- **Expected Behavior:** Add a **"Resend Code"** button to the verification modal (used in both initial signup and unverified login flows) with a short cooldown timer (e.g., 60 seconds).

---

## 5. Third-Party Auth

### Google OAuth Integration
- **Problem:** The frontend is missing Google Sign-In / Sign-Up UI controls.
- **Expected Behavior:** Add a **"Continue with Google"** button on both the Login and Signup pages and wire it to the backend Google OAuth flow (`/auth/google`).
