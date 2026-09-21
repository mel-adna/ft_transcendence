# Backend issues

Status checked 2026-09-21 against `1dadfa2` on `mdbentaleb`. Only unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

Nothing here blocks a feature today.

## Not blocking

Real defects, but nothing visible is broken.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 22 | A failed verification email is still swallowed, and the Gmail password is still in the file | Signup answers 201 while the user is stranded with no code and no error anywhere | Small |
| 28 | The login limit counts successful logins, not just failed ones | Signing in and out a few times spends the budget, then it is one attempt every three minutes | 1 number |
| 30 | A dead API key is still sitting in `application.yaml` | Reads like a working credential, and it is in the public history | Delete 1 line |
| 29 | Rate limit buckets are created and never removed | One map entry per distinct address and email, kept for the life of the process | Small |

---

# Not blocking

## 28. The login limit counts successful logins, so ordinary use spends the budget

`RateLimitAspect` advises with `@Before`, so a token is consumed before the method runs and
regardless of what it returns. A login that succeeds costs exactly as much as one that fails.

`AuthController.login` is annotated:

```java
@RateLimit(capacity = 5, durationInMinutes = 15, keyType = RateLimitKeyType.IP_AND_EMAIL)
```

Worth being precise about what that means, because the numbers read worse than they are. The bucket
is built with `refillGreedy(capacity, Duration.ofMinutes(durationInMinutes))`, which trickles tokens
back continuously rather than refunding all five at the quarter hour. Five per fifteen minutes is
therefore one token every three minutes, with five of them available in a burst. Once the burst is
spent, the sixth attempt answers 429 and the wait is about three minutes, not fifteen.

So this is a throttle rather than a lockout, and it is not urgent. It is still worth a change,
because signing in and signing out is a thing a person does on purpose, and doing it five times in
a row is neither rare nor suspicious. Spending an anti-guessing budget on correct passwords means
the limit fires for the wrong people.

The protection actually wanted here is against password guessing, which means counting failures:

- Raise the capacity so ordinary use cannot reach it. Twenty per fifteen minutes still stops a
  guessing run and leaves a demo alone. That is a one number change.
- Or move the limiter so it only counts a failure. `@Before` cannot see the outcome, but
  `@AfterThrowing`, or an `@Around` that consumes a token only when the call throws, can.

The other three are fine as they are. `resend-verification` and `forgot-password` are three per hour
per email, and both are only ever triggered deliberately by a person, so counting attempts there is
right. `signup` is keyed on address and email together and a new signup uses a new email, so it
never really binds.

The frontend reads `retryAfterSeconds` off the 429 and says "Too many attempts. Try again in 3
minutes." rather than the bare server message, so the wait is at least visible while this stands.

## 30. The dead public API key is still in `application.yaml`

`application.yaml` still contains an unused API key:

```yaml
public-key: ${PUBLIC_API_KEY:2a4ed48168bc0178dd13ed73bb319aaf6d83e57222fcf0ac630b7671be277caf}
```

Nothing in Java reads it any more, and the value is rejected with 401, so it is dead config rather
than a live credential. It is worth deleting anyway for two reasons: anyone reading the file will
take it for a working key and waste time on it, and it is a credential shaped string sitting in a
public repository, which is the same tidy up the Gmail password in issue 22 needs.

## 22. A failed verification email is swallowed, so signup can report success and strand the user

Unchanged since the last check, and now slightly wider. `EmailService.sendEmail` is still `@Async`
and still wraps the send in a try/catch that only logs:

```java
} catch (Exception e) {
    log.error("Infrastructure Error: Failed to send email to [{}]. Reason: {}", to, e.getMessage());
}
```

Because it is asynchronous, `signup` has already returned 201 by the time a failure is known, and
because the exception is swallowed, nothing reaches the caller. If the send fails the user sees
"Verification code has been sent to your email", no code ever arrives, and the only trace is a line
in the container log.

The new `sendWelcomeEmail` calls straight into the same method, so it inherits the same silence.
That one matters less, since nobody is blocked by a missing welcome note.

What makes this worth fixing is what it depends on. `application.yaml` still carries a personal
Gmail account and an app password in plaintext:

```yaml
username: mohamedbentalebakilo@gmail.com
password: pyno tbky wasf whvy
```

Google revokes app passwords on its own, and when that happens every signup in the product stops
working silently, with no failing test and no error surface.

**Fix:** two separate things. Give the failure a surface, by recording the send outcome or by
retrying, so a broken mailer is visible. And move the credential to an environment variable, which
is the same rotation already planned for the other secrets. Both of those values are in the public
repository history now, so the account password wants changing whatever else happens.

## 29. Rate limit buckets are never evicted

`RateLimitingService` keeps every bucket it has ever made:

```java
private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

public Bucket resolveBucket(String key, int capacity, int durationInMinutes) {
    return buckets.computeIfAbsent(key, k -> createNewBucket(capacity, durationInMinutes));
}
```

Nothing removes an entry. For the endpoints keyed on the address alone that is bounded by the
number of addresses, which is fine. For the four keyed on the email, or on the address and email
together, the key contains a string the caller chooses, so the number of entries is bounded only by
how many different emails someone sends. A loop posting to `/auth/login` with a new address each
time adds a permanent entry per request.

It grows slowly and it is not reachable without a deliberate script, which is why it is at the
bottom of this file rather than the top.

**Fix:** give the map an expiry. Caffeine with `expireAfterAccess` a little longer than the widest
window is the usual answer and is a drop in replacement here:

```java
Cache<String, Bucket> buckets = Caffeine.newBuilder()
        .expireAfterAccess(Duration.ofHours(2))
        .build();
```
