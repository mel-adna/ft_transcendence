# Chat Service — Hybrid Integration Guide

This is the **realtime chat / WebSocket** service (Node.js + Express + Socket.io +
Prisma). It is one half of a **hybrid backend**:

| Service | Stack | Owns |
|---|---|---|
| `backend/` | Java / Spring Boot | Auth, users, workspaces, tasks, comments, notifications, activity logs |
| `chat-service/` | Node.js + Socket.io | Realtime chat: rooms, messages, typing, presence, read receipts |

Both talk to the **same PostgreSQL**. Auth tokens are issued **only by the Java
backend**; this service verifies them and never mints its own.

It was moved out of `backend/` into `chat-service/` specifically so it does **not
conflict** with the Java backend at merge time — the two trees are disjoint.

---

## 1. JWT contract (action needed from the Java/Auth side)

The chat service verifies the same JWT the Java backend issues. For that to work:

### a) Shared secret
Set `JWT_SECRET` in `chat-service` to the **same value** as the Java app's
`app.jwt.secret` (currently the `JWT_SECRET` env in their `application.yaml`).

### b) Recommended: add `id` and `username` claims (small change on their side)
Today the Spring token only sets `subject = email` (see `JwtUtils.generateToken`
+ `UserPrincipal.getUsername()` returning the email). The chat service already
**works** with that (it uses email as the user id and derives a username), but it's
cleaner if the token carries the real user id and username.

In `JwtUtils` / `UserService` where the token is generated, pass extra claims:

```java
Map<String, Object> claims = new HashMap<>();
claims.put("id", user.getId().toString());      // stable user id
claims.put("username", user.getFirstName());     // or whatever display name
String accessToken = jwtUtils.generateToken(claims, userPrincipal);
```

No change is required on the chat side when you do this — `SocketAuthUseCase`
already prefers `id`/`username` claims and falls back to the subject/email.

### c) What the chat service reads (already tolerant)
`chat-service/src/application/socket/SocketAuthUseCase.js`:
- `id`       ← `id` claim → `userId` → `sub`
- `username` ← `username` claim → email local-part → `sub`
- `email`    ← `email` claim → `sub`

---

## 2. nginx routing (single origin for the frontend)

Route by path so the browser sees one host:

```nginx
# Java REST API
location /api/v1/ {
    proxy_pass http://backend:8080;
}

# Chat REST (history/search) + Socket.io WebSocket → Node
location /api/chat/ {
    proxy_pass http://chat-service:5005;
}
location /socket.io/ {
    proxy_pass http://chat-service:5005;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Frontend env: point `VITE_API_URL` at the Java base (`/api/v1`) for auth/tasks,
and `VITE_WS_URL` / chat calls at the chat service. (The chat feature uses
`VITE_WS_URL` for the socket and `VITE_API_URL` for chat history — keep chat
history pointed at `/api/chat` via nginx.)

---

## 3. docker-compose (add chat-service alongside backend)

```yaml
  chat-service:
    build: ./chat-service
    container_name: teampulse-chat
    environment:
      JWT_SECRET: ${JWT_SECRET}          # MUST equal the Java app.jwt.secret
      DATABASE_URL: ${CHAT_DATABASE_URL} # same Postgres, chat-owned tables
      REDIS_URL: redis://redis:6379      # optional, enables multi-instance
      PORT: 5005
    depends_on: [postgres, redis]
    networks: [teampulse_net]
```

Redis is **optional** — without `REDIS_URL` the chat runs single-instance; with it,
the Socket.io Redis adapter enables horizontal scaling. The Java side already runs
a `redis` service, so chat can reuse it.

---

## 4. OPEN ITEM — data model (needs a team decision, deliberately deferred)

The two sides currently model chat **differently**:

- **Java schema** (`V1__init_schema.sql`): a flat `chat_messages` table keyed by
  `workspace_id`, with denormalized `sender_name`/`sender_avatar_url`, no rooms,
  DMs, threads, edits, or read receipts.
- **Chat service** (Prisma): `Room` / `RoomMember` / `Message` / `ReadReceipt`,
  supporting group + DM rooms, threads, edits, soft-delete, and read receipts.

These overlap and must not both own chat tables. **Proposed split:**
- Chat service owns all chat tables (`rooms`, `room_members`, `messages`,
  `read_receipts`) via Prisma migrations.
- Drop `chat_messages` from the Java schema, OR scope the Java side to never write
  chat and treat the chat service as the source of truth.
- Both reference the Java-owned `users.id` as the foreign user identity.

This is **not yet implemented** — it changes the Java team's migration, so it needs
to be agreed in a team sync before either side touches it.

---

## 5. Run locally (standalone)

```bash
cd chat-service
npm install
JWT_SECRET=<same-as-java> DATABASE_URL=<postgres-url> npm run dev
```
