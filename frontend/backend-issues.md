# Backend issues

Status verified 2026-09-13 against the merged backend at `fb26685`, by reading the source and
measuring every claim against the running API on a freshly migrated database. Everything already
fixed has been removed, so the numbering has gaps.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a
given issue stays valid. The order of this file is by priority: everything that blocks a
feature comes first.

## Blocking

A mandatory requirement with nothing behind it, or a state a user cannot get out of.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 17 | The public API has keys but no rate limiting | The spec says rate limited, and 150 calls in a row all return 200 | Small |

## Not blocking

Real defects, but nothing visible is broken today. Worth fixing, not urgent.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 22 | A failed verification email is swallowed | Signup answers 201 while the user is stranded with no code and no error anywhere | Small |
| 25 | An expired token returns 403, not 401 | Silent refresh cannot fire on the status the spec assumes, so sessions die at 15 minutes | 2 lines |
| 26 | Avatars are served over plain http from port 9000 | On `https://localhost` the browser blocks every avatar as mixed content | Config |
| 27 | No real Google OAuth client exists, and a Google signup is created disabled | The Continue with Google button cannot be switched on, and the first Google login makes an account that can never use a password | Config + 1 line |

---

# Blocking issues

## 17. The public API is keyed but still not rate limited

`README.md` section 2E lists this under **Core Features (MVP, Mandatory Part)**:

> **Hardened Public API**: Exposes five secure, rate-limited endpoints requiring API keys:
> `/api/tasks`, `/api/users`, `/api/organizations`, `/api/stats`, `/api/chat`

Most of it now exists. `PublicApiController` registers all five under `/api/v1/public/`, and
`ApiKeyAuthFilter` checks an `X-API-KEY` header against `app.api.public-key`. Measured on the
running backend:

```
no header        ->  401  {"error":"Unauthorized","message":"Invalid or missing X-API-KEY header"}
wrong key        ->  401
correct key      ->  200  on all five paths
```

What is missing is the word **rate-limited**. Measured: 150 requests in a row with a valid key,
all 200, none throttled. Searching the backend and the nginx config still finds no rate limiting
of any kind: no bucket4j, no resilience4j, no `@RateLimiter`, no `limit_req` zone.

This is the last piece of the one requirement that is mandatory rather than optional, and it is
the easiest thing for an evaluator to check: point `curl` at `/public/stats` in a loop with the
key and nothing pushes back.

Cheapest honest implementation is a `limit_req` zone in nginx in front of the public paths, since
the key is already being checked in the filter and nginx is already in the stack.

**Second point, smaller.** The key sits in `application.yaml` as
`${PUBLIC_API_KEY:2a4ed4...}`, so the fallback is a real working key committed to a public repo.
The env var override is the right shape; the default should not be a usable key.
---

# Not blocking

## 22. A failed verification email is swallowed, so signup can report success and strand the user

`EmailService.sendEmail` is `@Async` and wraps the send in a try/catch that only logs:

```java
} catch (Exception e) {
    log.error("Infrastructure Error: Failed to send email to [{}]. Reason: {}", to, e.getMessage());
}
```

Because it is asynchronous, `signup` has already returned 201 by the time a failure is known, and
because the exception is swallowed, nothing reaches the caller. If the mail send fails, the user
sees "Verification code has been sent to your email", no code ever arrives, and issue 21 means
there is no way to ask for another. The only trace is a line in the container log.

Sending really does work today, so this is latent rather than broken: measured on the running
backend, the log shows `Email successfully sent`. What makes it worth fixing is what it depends
on. `application.yaml` carries a single personal Gmail account and an app password committed in
plaintext. Google revokes app passwords on its own, and when that happens every signup in the
product silently stops working with no failing test and no error surface.

**Fix:** two separate things. Give the failure a surface, by recording the send outcome or by
retrying, so a broken mailer is visible. And move the credential to an environment variable, which
is the same rotation that was already planned for the other secrets.

## 25. An expired access token returns 403, so a client cannot tell a dead session from a denial

`frontend-issues.md` asks the frontend to "handle 401 responses" and refresh in the background.
The interceptor that does this already existed. It never fired, because the backend does not send
a 401.

`JwtAuthenticationFilter` catches `ExpiredJwtException`, logs it, and calls
`filterChain.doFilter(...)`. It does not rethrow, so the `@ExceptionHandler(ExpiredJwtException)`
in `GlobalExceptionHandler` never runs. The request then reaches the authorization layer with no
authentication set, and because no `AuthenticationEntryPoint` is configured, Spring falls back to
its default and answers 403 with its generic error body.

Measured with a correctly signed, genuinely expired token:

```
GET /api/v1/users/me
  -> 403  {"status":403,"error":"Forbidden","message":"Forbidden","path":"/api/v1/users/me"}
```

The same 403 comes back for a request with no token at all, so status alone cannot separate
"your session ended, refresh it" from "you may not do this".

**Fix:** register an `AuthenticationEntryPoint` that writes 401 for unauthenticated requests.

```java
.exceptionHandling(e -> e.authenticationEntryPoint(
        (req, res, ex) -> res.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthenticated")))
```

The frontend now works around this by treating a 403 whose body is the literal `Forbidden` as an
ended session, since every 403 the application raises itself carries a real sentence. That
workaround should come out once the entry point exists, because it depends on an error body
nobody promised to keep stable.

## 26. Avatar URLs are plain http on port 9000, so they are blocked over https

`FileStorageService` stores `String.format("%s/%s/%s", publicUrl, bucketName, fileName)`, and
compose sets `MINIO_PUBLIC_URL=http://localhost:9000`. Uploading works and the object really is
public:

```
POST /users/me/avatar  -> 200, avatarUrl http://localhost:9000/teampulse-avatars/avatar-<uuid>.png
GET  that url          -> 200, content-type image/png
```

So the report that avatars "store correctly but do not display" is accurate, and the cause is not
in the upload or the bucket policy. nginx serves the app over TLS on 443, the stored URL is
plain `http`, and a browser refuses to load `http://` images into an `https://` page. The
`onError` fallback then draws initials, which is why it looks like the image is missing rather
than blocked. On `http://localhost:5173` the same avatar displays.

There is a second problem behind it: the URL only resolves at all because port 9000 is published
to the host. Nothing outside a laptop can reach `localhost:9000`.

**Fix:** serve MinIO through nginx on the same origin, and store a same-origin URL.

```nginx
location /avatars/ { proxy_pass http://minio:9000/teampulse-avatars/; }
```

with `MINIO_PUBLIC_URL` pointing at that path. The Vite dev server needs the same proxy entry so
the two entry points behave alike. Existing rows keep their absolute URLs and would need
rewriting, which on a wiped database is nothing.

## 27. Google sign in needs a real OAuth client, and `googleLogin` creates the account disabled

The frontend side is built and merged. `LoginPage` renders a Google button above the email form on
both tabs, and a successful credential is posted to `POST /auth/google` as `{ idToken }`, which is
the shape `GoogleLoginRequest` already expects. Nothing else is needed from the frontend.

It is switched off until two things exist.

### 1. A real OAuth client, which only you can create

`application.yaml` has:

```yaml
client-id: ${GOOGLE_CLIENT_ID:407408718192.apps.googleusercontent.com}
```

That default is the sample client from Google's own documentation. It is not ours, and it has no
authorized origin for this app, so Google Identity Services refuses to initialize against it and
the button never becomes clickable.

What is needed, in Google Cloud Console:

1. Create an **OAuth 2.0 Client ID** of type **Web application**.
2. Add authorized JavaScript origins for **every** entry point we run. They are separate origins
   as far as Google is concerned, and a missing one fails silently:
   - `http://localhost:5173` (Vite directly)
   - `https://localhost` (through nginx)
3. Configure the OAuth consent screen. While it is in Testing, only accounts added as test users
   can sign in, which is fine for the evaluation.

The resulting client ID then goes in **two** places, because the browser needs it at render time
to draw the button and the backend needs it to validate the token:

- backend: `GOOGLE_CLIENT_ID`
- frontend: `VITE_GOOGLE_CLIENT_ID`, already wired through `docker-compose.yml` and
  `.env.example`

A client ID is not a secret, so both can be committed or passed as plain environment variables.
Until `VITE_GOOGLE_CLIENT_ID` is set the button is not rendered at all, so an unconfigured
environment shows the ordinary email form rather than something broken.

### 2. A one line fix in `googleLogin`

A user arriving through Google for the first time is built like this:

```java
User.builder()
        .email(email)
        .firstName(firstName)
        .lastName(lastName)
        .avatarUrl(pictureUrl)
        .provider(AuthProvider.GOOGLE)
        .providerId(googleId)
        .build()
```

`enabled` is never set, and `User.enabled` defaults to `false`. Google sign in itself still works,
because `googleLogin` issues tokens directly rather than going through `authenticationManager`, so
the disabled check never runs on that path. The damage shows up afterwards: that account is stored
as unverified forever. If the person ever sets a password and signs in normally they get the 403
from issue 25's path, and they cannot verify their way out, because no verification code was ever
issued for them.

Google has already verified the address, which is the whole point of accepting the token, so:

```java
.enabled(true)
```

Worth noting the same builder stores Google's `picture` URL as the avatar. That one is an
`https://lh3.googleusercontent.com/...` address, so unlike issue 26 it displays correctly over TLS.
