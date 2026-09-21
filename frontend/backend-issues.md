# Backend issues

Status checked 2026-09-21 against `1dadfa2` on `mdbentaleb` and `c3efc42` on `aarab`, merged and run
together. Only unresolved issues are listed.

Issue numbers are stable identifiers, not priorities. They never change, so a reference to a given
issue stays valid. The order of this file is by priority.

## Blocking

A state a user cannot get out of.

| # | Issue | What breaks | Effort |
|---|---|---|---|
| 34 | The chat-service image never generates the Prisma client | chat-service crashes on start and restarts forever, so chat is offline for everyone | 2 lines |
| 35 | chat-service checks Java tokens with the wrong key | Once it runs, chat refuses every signed in user | 2 lines |
| 33 | Two people whose emails start the same way cannot both use chat | The second one is refused by chat for good, and chat shows email fragments instead of names | Both sides |

## Not blocking

Real defects, but nothing visible is broken.

| # | Issue | Why it matters | Effort |
|---|---|---|---|
| 22 | A failed verification email is still swallowed, and the Gmail password is still in the file | Signup answers 201 while the user is stranded with no code and no error anywhere | Small |
| 28 | The login limit counts successful logins, not just failed ones | Signing in and out a few times spends the budget, then it is one attempt every three minutes | 1 number |
| 31 | The Google OAuth client does not allow `http://localhost:5173` | Google sign in is refused on the Vite port; `https://localhost` works | Console setting |
| 32 | The backend never receives the JWT lifetimes from `.env` | `.env` says refresh tokens last 7 days; they last 3 | 2 lines |
| 36 | A client mistake answers 500 instead of a 4xx | A wrong method, broken JSON or the wrong content type is reported as the server's own failure | Small |
| 30 | A dead API key is still sitting in `application.yaml` | Reads like a working credential, and it is in the public history | Delete 1 line |
| 29 | Rate limit buckets are created and never removed | One map entry per distinct address and email, kept for the life of the process | Small |

---

# Blocking

## 34. The chat-service image never generates the Prisma client

`chat-service/Dockerfile` installs dependencies before it copies the source:

```dockerfile
COPY package*.json ./
RUN npm install
COPY . .
```

`@prisma/client` builds itself during `npm install` from `prisma/schema.prisma`, and at that moment
the schema is not in the image yet. So the image ships an empty client, and the service dies on its
first database call:

```
@prisma/client did not initialize yet
```

Docker restarts it and it dies again, forever. nginx answers 502 for every chat path, so the Chat
page shows its offline panel for everyone.

**Fix:** generate the client once the schema is there, after `COPY . .`:

```dockerfile
RUN npx prisma generate
```

and add `chat-service/.dockerignore` containing `node_modules`, so a `node_modules` folder on the
host is never copied over the one built in the image.

## 35. chat-service checks Java tokens with the wrong key

The Java backend signs tokens with the secret decoded from base64:

```java
Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))
```

`chat-service/src/application/socket/SocketAuthUseCase.js` checks them with the same secret used as
plain text:

```js
payload = jwt.verify(token, process.env.JWT_SECRET);
```

Those are two different keys, so every token from the Java login fails the signature check. Chat
answers 401 to every request and refuses every socket connection. The dev tokens printed by
`prisma/seed.js` hide this, because they are signed with the same plain text key.

**Fix:** decode the secret the way Java does:

```js
payload = jwt.verify(token, Buffer.from(process.env.JWT_SECRET, 'base64'));
```

and sign with `Buffer.from(secret, 'base64')` in `prisma/seed.js`, so the seed tokens keep working.

This also needs both services to have the same `JWT_SECRET` in the first place. `docker-compose.yml`
on `aarab` gives it to chat-service but not to the backend, which then signs with the default in
`application.yaml`. That half is fixed on `szemmouri` by passing `JWT_SECRET=${JWT_SECRET}` to the
backend.

## 33. Two people whose emails start the same way cannot both use chat

The Java token carries `id` and `sub`, the email, and no name. chat-service fills the gap in
`SocketAuthUseCase` by taking the part of the email before the `@` and storing it as the user's
`username`. That column is `@unique` in `chat-service/prisma/schema.prisma`, so the first person
whose email starts `said@` claims the name, and anyone else whose email starts the same way can
never get in. Measured on the merged stack with 34 and 35 fixed locally, two fresh accounts one after
the other:

```
said1789985261287@example.com  ->  GET /api/chat/rooms 200  {"rooms":[]}
said1789985261287@example.org  ->  GET /api/chat/rooms 401  {"error":"Unauthorized: Invalid
                                   `prisma.user.upsert()` invocation: Unique constraint failed ..."}
```

The second account is refused on every chat request and every socket connection, permanently,
because the collision is in stored data. An evaluator who makes `test@gmail.com` and
`test@yahoo.com` hits this on the second one. Two smaller problems ride along:

- The error text is Prisma's own, sent straight to the browser by `authMiddleware`. It should be a
  plain "Unauthorized" with the detail kept in the log.
- The same stored `username` is what chat displays, so every member list and message label shows
  `alice1789984631525` rather than Alice Tester.

`chat-service/INTEGRATION.md` suggests a `username` claim set to the first name. That makes the
collision more likely, not less: every second Said would be locked out. Do not apply it as written.

The fix is to stop deriving a unique value from something two people can share, and to keep what is
shown separate from what is unique:

- **chat-service** keys uniqueness on something that already is unique. The Java `id` claim is,
  and `email` is already `@unique` on its own, so `username` either takes the id or stops being
  unique. The name shown in the UI goes in a column of its own that is allowed to repeat.
- **Java** adds a `name` claim, first and last name, in `JwtUtils.generateToken` next to `id`, for
  chat to fill that display column from. `ensureFromIdentity` already updates stored values on every
  connect, so existing users pick the name up the next time they open chat.

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

## 32. The backend never receives the JWT lifetimes from `.env`

`docker-compose.yml` passes the backend its database, MinIO and Google settings, but not the token
lifetimes. So `application.yaml` falls back to its own defaults, and the values in `.env` are never
read:

| Key | `.env` says | Backend actually uses |
|---|---|---|
| `JWT_REFRESH_EXPIRATION` | 604800000, 7 days | 259200000, 3 days |
| `JWT_ACCESS_EXPIRATION` | 900000, 15 minutes | 900000, 15 minutes |

Access happens to match. Refresh does not, so a session that `.env` says lasts a week ends after
three days. This is the same kind of bug as `JWT_SECRET`, which was missing from the backend in the
same way; that one broke chat outright, because chat-service verified tokens with the `.env` value
while Spring signed them with the yaml default. It is fixed on `szemmouri` by passing
`JWT_SECRET=${JWT_SECRET}`.

**Fix:** pass the two lifetimes the same way, or delete them from `.env` so nobody reads a value
that is not used. `GOOGLE_CLIENT_SECRET` and `SERVER_PORT` are in the same position, and harmless
today because one is empty and the other matches.

## 36. A client mistake answers 500 instead of a 4xx

`GlobalExceptionHandler` ends with a catch-all that answers 500 "An unexpected server error
occurred":

```java
@ExceptionHandler(Exception.class)
```

Spring's own exceptions for a malformed request have no handler of their own, so they land there
too. Measured on the merged stack:

```
DELETE /api/v1/auth/login                     500, should be 405
POST   /api/v1/auth/login with broken JSON    500, should be 400
POST   /api/v1/auth/login as text/plain       500, should be 415
```

Nothing in the frontend sends these, so no user sees it. It matters for anyone calling the API by
hand, which is exactly what an evaluator does with the public API: a POST to `/public/tasks`
answers 500, which reads as a crash rather than "not supported".

**Fix:** handle the three in `GlobalExceptionHandler`, next to the others:

- `HttpRequestMethodNotSupportedException` answers 405
- `HttpMessageNotReadableException` answers 400
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
