# Frontend Action Items

### 1.  Missing Email Verification page after sginup

- After a successful signup (`/api/v1/auth/signup`), redirect the user to a new Email Verification page instead of the login or dashboard page.

- Do not send an Authorization header with this request (ensure `Bearer` token is omitted).