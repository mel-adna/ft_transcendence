# Backend issues

Status verified 2026-09-08 against the merged backend at `9135b49`, by reading the source and
measuring every claim against the running API. Everything already fixed has been removed, so the
numbering has gaps. What is left is what still needs doing.

Six issues closed in that merge and were each confirmed by measurement, not by reading the diff:
16, 18, 19, 20, 21 and 23. Two things are left: the rate limiting half of 17, and 22.

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
