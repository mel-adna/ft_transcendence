# Backend issues

Status checked 2026-09-27 against `10ea735` on `mdbentaleb` and `7b7ee2f` on `aarab`, merged and run
together. Only unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

Fixed since the last check, and removed from this file: **33** (email prefixes collided in chat),
**34** (the chat image shipped no Prisma client), **35** (chat rejected every Java token) and
**32** (the backend never received the token lifetimes). Nothing blocks a feature today.

## Not blocking

Real defects, but nothing visible is broken.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 37 | Any signed in user can read any team's member list | Names and email addresses of teams you do not belong to, from one request | 1 line |
| 38 | An invitation to `Foo@Bar.com` never reaches the account `foo@bar.com` | The invitation exists and looks sent, but it is not in the invitee's list | Small |
| 22 | A failed verification email is still swallowed, and the Gmail password is still in the file | Signup answers 201 while the user is stranded with no code and no error anywhere | Small |
| 28 | The login limit counts successful logins, not just failed ones | Signing in and out a few times spends the budget, then it is one attempt every three minutes | 1 number |
| 31 | The Google OAuth client does not allow `http://localhost:5173` | Google sign in is refused on the Vite port; `https://localhost` works | Console setting |
| 36 | Broken JSON still answers 500 instead of 400 | Half fixed: a wrong method answers 405 now, the rest of the client mistakes do not | Small |
| 30 | A dead API key is still sitting in `application.yaml` | Reads like a working credential, and it is in the public history | Delete 1 line |
| 29 | Rate limit buckets are created and never removed | One map entry per distinct address and email, kept for the life of the process | Small |

---

# Not blocking

## 37. Any signed in user can read any team's member list

`WorkspaceController.getWorkspaceMembers` takes the caller's `principal` and never uses it:

```java
List<WorkspaceMemberResponse> members = workspaceService.getWorkspaceMembers(workspaceId);
```

Every other workspace endpoint checks membership first. This one does not, so any account can read
any team's roster by guessing or reusing a workspace id, and each row carries a member's first name,
last name, email and avatar. The ids are UUIDs, so this is not trivially enumerable, but ids travel
in URLs and in the invitation payloads.

**Fix:** the same membership check the other endpoints use, before building the response.

## 38. An invitation to `Foo@Bar.com` never reaches the account `foo@bar.com`

The invitation is stored with the address exactly as typed. The two lookups disagree about case:

- `findByInviteeEmailAndStatus` and `existsByWorkspaceIdAndInviteeEmailAndStatus` match exactly, so
  the list of invitations addressed to a user misses any invitation whose case differs.
- accept and reject compare with `equalsIgnoreCase`, so the same invitation would be accepted
  happily if the invitee could see it.

An admin who types a capital letter creates an invitation nobody can find, and the duplicate check
does not stop them creating a second one. The frontend lowercases the address before sending, which
hides it from this app, but not from the API or from Swagger.

**Fix:** store the address lowercased, or make both queries case-insensitive.

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

## 31. The Google OAuth client does not allow `http://localhost:5173`

Google sign in works through nginx and is refused on the Vite port. Measured on both login pages:

```
https://localhost        no failed requests, no complaint from Google
http://localhost:5173    403 from https://accounts.google.com/gsi/button
                         [GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

Google treats these as separate origins, and only the first is registered. **Fix:** add
`http://localhost:5173` under Authorized JavaScript origins for this client in Google Cloud
Console. Only people using the Vite port are affected; anyone going through `https://localhost` is
not.

## 36. Broken JSON still answers 500 instead of 400

`GlobalExceptionHandler` ends with a catch-all that answers 500 "An unexpected server error
occurred":

```java
@ExceptionHandler(Exception.class)
```

A wrong method is handled now: `HttpRequestMethodNotSupportedException` answers 405, which is why
`POST /workspaces/{id}/invitations` on the old members path says "not supported" rather than
"crashed". The other malformed requests still have no handler of their own and fall through to the
catch-all:

| Request | Answers | Should answer |
|---|---|---|
| Broken JSON in the body | 500 | 400 |
| `{"role": "admin"}`, a value outside the enum | 500 | 400 |
| A path id that is not a UUID | 500 | 400 |
| The wrong `Content-Type` | 500 | 415 |
| A missing query parameter, such as `email` on `/users/search` | 500 | 400 |

They all arrive as Jackson or Spring binding failures. The enum one is the easiest to hit by hand,
since `role` has to be upper case and nothing says so.

**Fix:** three more handlers next to the 405 one:

- `HttpMessageNotReadableException` answers 400
- `MethodArgumentTypeMismatchException` and `MissingServletRequestParameterException` answer 400
- `HttpMediaTypeNotSupportedException` answers 415

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
