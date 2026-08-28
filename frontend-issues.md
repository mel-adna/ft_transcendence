# Frontend Action Items

### 1. Task Creation Card: Assignee Field
- Add an "Assign To" input field when creating a new task.
- If the field is left empty, automatically default the assignment to the task creator.

### 2. Task Details: Expanded Click View
- Make existing task cards clickable to open a detailed view of the task.

### 3. Activity Logs: API Endpoint Integration
- Currently, you show only "task created". It needs to display the full spectrum of events provided by the API.
- Update the Activity Logs component to fetch data dynamically from the backend endpoint.

### 4. Reset Password Page: Missing UI
- Create a "Reset Password" page to be displayed when a user clicks the password reset link sent to their email via the `/auth/forgot-password` endpoint.
- Currently, clicking the emailed link opens a completely empty page with no input fields.
- When the user submits the form, you must extract the security token from the URL and send it alongside the new password to the `/auth/reset-password` endpoint.

### 5. User Signup: Email Verification Code Step
- Update the local email signup flow to include an account verification step immediately after the user submits their registration details.
- Redirect them to a dedicated "Verify Account" page (or display a verification modal/component).
- Add an input field on this page for the user to type the verification code (OTP) that was dispatched to their email address.