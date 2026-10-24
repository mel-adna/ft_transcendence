*This project has been created as part of the 42 curriculum by moben-ta, ouzouini, szemmour, ayaarab, mel-adna.*

# Team-Pulse

## Description

Team-Pulse is a web app where a small team organizes its work in one place: a shared task board, a team chat, and dashboards that show the team's progress. A change made by one person appears on everyone else's open page without a reload.

Key features:

- Accounts with an email verification code, password reset and Google sign-in.
- Teams with roles (admin, member, viewer) and invitations by email.
- A task board (To Do, Doing, Done) with priorities and assignees, and task import and export as CSV and JSON.
- Real-time chat with group rooms and direct messages, and live updates on every page.
- Notifications for every change that concerns you.
- Analytics dashboards with filters, a custom date range and PDF export.
- GDPR tools: download everything stored about you, or delete your account.
- A public API with API keys, and monitoring with Prometheus and Grafana.

## Instructions

### 🛠️ Prerequisites

Ensure your host system meets the following software requirements:

| Tool | Recommended Version | Note |
| :--- | :--- | :--- |
| **Docker Engine** | `24.0.0+` | Containerization runtime |
| **Docker Compose** | `v2.20.0+` | Multi-container orchestration |
| **GNU Make** | `3.81+` | Build automation utility |
| **OpenSSL** | `3.0+` | Automatic SSL certificate generation |
| **Java JDK** | `21` | Only for local backend development |
| **Node.js** | `v20.0.0+` | Only for local frontend and chat service development |

Running the project needs only Docker, Docker Compose, make and OpenSSL: Java, Node.js and PostgreSQL run inside the containers. **Ports 8080 and 8443 must be free on the host machine.**

---

### 🔑 Environment Setup & Secrets Configuration

Credentials stay in files that Git ignores: `.env` and the `secrets/` folder. Set them up before the first start.

#### 1. Generating a Gmail App Password
Sign-up codes and system notifications are dispatched via SMTP:
1. Go to your **[Google Account Security Settings](https://myaccount.google.com/security)**.
2. Enable **2-Step Verification** if not already active.
3. Search for **App Passwords** in the security search bar.
4. Create a new App Password (e.g., named `TeamPulse-Backend`).
5. Copy the generated **16-character passcode** (without spaces).

#### 2. Configuring Secrets
1. Run `make`. It creates `.env` from `.env.example`, and the `secrets/` folder with a generated JWT secret and generated passwords for the database, Redis, MinIO and Grafana.
2. `.env.example` comes with the team's `MAIL_USERNAME`, `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Change them there to use your own Google account. If `VITE_GOOGLE_CLIENT_ID` is empty, the Google sign-in button is hidden.
3. Put the 16-character App Password of `MAIL_USERNAME` in `secrets/mail_password.txt`, and the OAuth 2.0 client secret of `GOOGLE_CLIENT_ID` in `secrets/google_client_secret.txt`.

---

### ⚡ Quick Start

Run the entire application stack (Frontend, Backend, Chat, PostgreSQL, Redis, MinIO, Nginx, Prometheus, Grafana) with a single command:

1. Clone the repository
```bash
   git clone https://github.com/mel-adna/ft_transcendence.git
```

2. Enter the project directory
```bash
  cd ft_transcendence
```


3. Build and launch all services
```bash
  make
```




> **Note:** Executing `make` automatically runs `generate_certs.sh` to generate self-signed TLS certificates, creates required environment configurations from `.env.example`, generates secure random credentials (JWT secret, DB, Grafana admin, MinIO, and Redis passwords), and executes `docker compose up -d --build`. The frontend is built for production and served by Nginx.

#### 🌐 Accessing Endpoints

Once the stack is initialized:

* **Web Application:** Access [https://localhost:8443](https://localhost:8443) *(accept the self-signed SSL certificate in your browser)*.
* **API Documentation (Swagger):** Access [https://localhost:8443/api/v1/swagger-ui/index.html](https://localhost:8443/api/v1/swagger-ui/index.html)
* **Grafana Monitoring:** Access [https://localhost:8443/grafana](https://localhost:8443/grafana)
* **Username:** Value of `GRAFANA_ADMIN_USER` in `.env`.
* **Password:** Stored in `secrets/grafana_admin_password.txt`.

---

### 🛠️ Makefile Commands

| Command | Description |
| --- | --- |
| `make` | Generates TLS certificates, creates configuration files, and starts all containers in detached mode. |
| `make ps` | Displays the current running status of all containers in the stack. |
| `make clean` | Stops all containers and removes active networks and volume data. |
| `make fclean` | Complete wipe: Stops containers, deletes Docker images, `secrets/` directory, certificates, and `.env`. |
| `make re` | Executes `make fclean` followed by `make` for a clean rebuild from scratch. |


## Resources

References:

- Frontend: [React](https://react.dev), [React Router](https://reactrouter.com), [Vite](https://vite.dev), [Tailwind CSS](https://tailwindcss.com/docs), [axios](https://axios-http.com/docs/intro), [Google Identity Services](https://developers.google.com/identity/gsi/web), [MDN](https://developer.mozilla.org)
- Backend: [Spring Boot](https://docs.spring.io/spring-boot/), [Spring Security](https://docs.spring.io/spring-security/reference/), [Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/), [Flyway](https://documentation.red-gate.com/fd), [springdoc-openapi](https://springdoc.org), [JJWT](https://github.com/jwtk/jjwt), [Bucket4j](https://bucket4j.com)
- Chat: [Node.js](https://nodejs.org/docs/latest/api/), [Express](https://expressjs.com), [Socket.IO](https://socket.io/docs/v4/), [Prisma](https://www.prisma.io/docs)
- Data and DevOps: [PostgreSQL](https://www.postgresql.org/docs/), [Redis](https://redis.io/docs/), [Docker Compose](https://docs.docker.com/compose/), [nginx](https://nginx.org/en/docs/), [Prometheus](https://prometheus.io/docs/), [Grafana](https://grafana.com/docs/grafana/latest/), [MinIO](https://github.com/minio/minio)
- Security and privacy: [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org), [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- Browser testing: [safaridriver](https://developer.apple.com/documentation/webkit/testing-with-webdriver-in-safari), [geckodriver](https://firefox-source-docs.mozilla.org/testing/geckodriver/)

How AI was used:

All members used AI assistants as helpers: to explain concepts and error messages, to review code, and to draft documentation and test scripts. Each member kept only what they understood, tested and can explain. What each member used it for:

- **moben-ta:**
- **ouzouini:** AI was used to research technical concepts, explore possible solutions to development challenges, and improve documentation. All implementations were reviewed and adapted to the project's needs.
- **szemmour:** Used Claude Code to review the frontend and pull requests, identify the root causes of bugs, and draft the Privacy Policy, Terms of Service, and status page. Used ChatGPT to understand frontend concepts.
- **ayaarab:** Used Claude Code to review and audit the chat service, find the root causes of socket, token and security bugs, and write the live test scripts (Socket.IO clients and Playwright) used to check each fix against the running stack. Used it to draft commit messages and the chat documentation.
- **mel-adna:** Used AI assistants to review code, understand some technical issues, and help with documentation and debugging.

## Team Information

| Member | Role(s) | Responsibilities |
|---|---|---|
| moben-ta | Technical Lead / Architect, Developer | The backend architecture and main technical choices. Builds the Spring Boot API, its security, the Docker secrets and the monitoring, and merges the branches into main. |
| ouzouini | Developer | Builds the data layer: the PostgreSQL database tables, the JPA models (entities), the enums, the DTOs and the custom exceptions. |
| szemmour | Project Manager / Scrum Master, Developer | Tracks progress, module points and next tasks, reviews and merges pull requests, and sends each bug to its owner. Builds the frontend core. |
| ayaarab | Developer | The real-time chat service (Node.js, Socket.IO, Prisma), the chat screens, and the live updates it relays. |
| mel-adna | Product Owner, Developer | Keeps the project scope and priorities, and builds the analytics dashboards and the notification bell. |

## Project Management

- **Organization:** the June plan split the project into five parts, one per member: backend core, database, frontend core, real-time chat, and analytics with Export/Import. Each member works on their own branch, merged into main. Since 12 October, changes also go through GitHub pull requests.
- **Meetings:** the team met in person at school to plan and work together, and talked on Discord when there was no need to meet.
- **Tools:** GitHub for branches and pull requests, and a shared status page with the module points and each member's next tasks.
- **Communication:** Discord, for questions, planning and bug reports, which go straight to the owner of the code.

## Technical Stack

- **Frontend:** React 19, React Router 7, Vite 8, Tailwind CSS 4, axios, socket.io-client, recharts and jsPDF. React Router makes a single-page app, and Tailwind 4 reads its colours from CSS variables, which the design system is built on. Vite builds the app into static files, and nginx serves them.
- **Backend:** Spring Boot 3.5 on Java 21, with Spring Security (JWT and Google sign-in), Spring Data JPA, Flyway, springdoc (Swagger) and Bucket4j. Spring brings security, validation, mail and metrics ready to use.
- **Chat service:** Node.js 22 with Express, Socket.IO 4 and Prisma 6. Node handles many open connections well, and Socket.IO adds rooms and reconnection.
- **Database:** PostgreSQL 15. The data is relational (users, teams, members, tasks), so foreign keys and transactions matter, and both JPA and Prisma support it. The chat service keeps its tables in its own `chat` schema on the same server.
- **Other:** Redis 7 carries events from the Java API to the chat service. MinIO stores avatars. nginx is the only published entry point: it serves HTTPS and routes `/api/v1` to the Java API and `/api/chat` and `/socket.io` to the chat service. Prometheus, Grafana, the PostgreSQL and NGINX exporters and cAdvisor do the monitoring. Docker Compose and the `Makefile` run it all.

## Database Schema

The Java API owns the main schema, created by Flyway in `backend/src/main/resources/db/migration/V1__init_schema.sql`. Every id is a UUID and every date a TIMESTAMP.

| Table | Key fields | Relations |
|---|---|---|
| `users` | `email` VARCHAR(100), `password_hash`, `first_name`, `last_name`, `provider` (LOCAL or GOOGLE), `enabled`, `deleted` BOOLEAN, `security_version` BIGINT | |
| `workspaces` | `name` VARCHAR(100), `description` VARCHAR(500), `type` (PERSONAL or ORGANIZATION), `deleted` BOOLEAN | `owner_id` → users |
| `workspace_members` | primary key (`workspace_id`, `user_id`), `role` (ADMIN, MEMBER or VIEWER) | → workspaces, → users |
| `tasks` | `title` VARCHAR(150), `description`, `status` (TODO, DOING, DONE), `priority` (LOW, MEDIUM, HIGH), `deleted` BOOLEAN | → workspaces, `assignee_id` and `creator_id` → users |
| `workspace_invitation` | `invitee_email`, `role`, `invitation_status` (PENDING, ACCEPTED, REJECTED, EXPIRED), `expires_at` | → workspaces, `inviter_id` → users |
| `notifications` | `type`, `message` VARCHAR(500), `entity_type`, `entity_id`, `is_read` BOOLEAN | `recipient_id` → users |
| `activity_logs` | `action_type`, `description`, `entity_id` | → users, → workspaces |
| `api_keys` | `hash_key` VARCHAR(64) (SHA-256, unique), `key_prefix`, `active` BOOLEAN, `last_used_at` | → users |
| `refresh_tokens` | `token_hash` VARCHAR(64) (unique), `expiry_date`, `revoked`, `consumed` BOOLEAN | → users |
| `verification_codes`, `password_reset_tokens` | `code` or `token`, `expiry_date` | → users |

The chat service keeps its own tables in the `chat` schema, through Prisma: `User` (the same id as in the Java API, `username`, `email`, `securityVersion`), `Room` (GROUP or DIRECT), `RoomMember` (role, PENDING or ACCEPTED), `Message` (`content` VARCHAR(4000), `type`) and `ReadReceipt`.

## Features List

| Feature | Who | What it does |
|---|---|---|
| Sign up | szemmour, moben-ta | Sign up, then type the 6-digit code sent by email |
| Sign in | szemmour, moben-ta | Email and password, or the Google button |
| Password reset | szemmour, moben-ta | A reset link by email, then a new password |
| Sessions | szemmour, moben-ta | Tokens renew before they expire, also with several tabs open. A password change signs out everywhere |
| Teams | szemmour, moben-ta | Create, edit, delete and switch teams. Newcomers land on a first-team screen |
| Invitations and roles | szemmour, moben-ta | Invite by email, even someone with no account yet. Accept or decline, change roles, remove members |
| Task board | szemmour, moben-ta | To Do, Doing and Done columns with drag and drop, priorities and assignees |
| Task import and export | szemmour, mel-adna | CSV and JSON files, with checks on import |
| Live updates | szemmour, ayaarab | A teammate's change to a task, member or team appears on every open page |
| Chat | ayaarab | Group rooms, direct messages that the other person accepts first, typing, read receipts, presence, and editing, deleting and searching messages |
| Notifications | moben-ta, mel-adna | A bell that fills live for every create, update and delete that concerns you |
| Analytics dashboard | mel-adna | Status and priority charts, per-member activity, filters, a custom date range and PDF export |
| Recent activity | szemmour, ouzouini | The dashboard's activity panel, read from the activity log |
| Settings | szemmour, moben-ta | Profile and avatar, password, API key, Download my data and account deletion |
| GDPR | moben-ta, szemmour | Download your data with an email confirmation, delete your account, and the Privacy Policy and Terms pages |
| Public API | moben-ta, szemmour | Workspaces and tasks over REST with an `X-API-Key` header, rate limits and Swagger |
| Monitoring | moben-ta, ayaarab | Metrics from every service in Prometheus, shown on Grafana dashboards |
| Security | moben-ta | HTTPS only, through nginx. Docker secrets, rate limits and input validation |
| Design system | szemmour | One set of colour tokens and shared components, used on every screen except the chat |

## Modules

| Module | Category, type | Points | Who |
|---|---|---|---|
| Frameworks for frontend and backend | Web, Major | 2 | szemmour, moben-ta |
| Real-time features with WebSockets | Web, Major | 2 | ayaarab |
| Organization system | User management, Major | 2 | moben-ta, szemmour, ouzouini |
| Public API | Web, Major | 2 | moben-ta, szemmour |
| Monitoring with Prometheus and Grafana | DevOps, Major | 2 | moben-ta |
| Advanced analytics dashboard | Data and analytics, Major | 2 | mel-adna |
| Backend as microservices | DevOps, Major | 2 | ayaarab, moben-ta |
| ORM for the database | Web, Minor | 1 | ouzouini, ayaarab |
| Notification system | Web, Minor | 1 | moben-ta, mel-adna |
| Remote authentication with OAuth 2.0 | User management, Minor | 1 | moben-ta, szemmour |
| Custom-made design system | Web, Minor | 1 | szemmour |
| Support for additional browsers | Accessibility, Minor | 1 | szemmour |
| Data export and import | Data and analytics, Minor | 1 | szemmour, mel-adna |
| User activity analytics dashboard | User management, Minor | 1 | mel-adna |
| GDPR compliance | Data and analytics, Minor | 1 | moben-ta, szemmour |
| Real-time collaborative features | Web, Minor | 1 | ayaarab, szemmour |

Point calculation: 7 Major modules make 14 points and 9 Minor modules make 9, so 23 in total. The subject requires 14 and counts at most 5 more as bonus, so 19 count.

Why we chose each module, and how it works:

- **Frameworks:** a clear structure on both sides: React 19 with React Router 7 (one file per screen in `frontend/src/pages`), and Spring Boot with controllers, services and repositories.
- **Real-time features:** chat needs the server to push. Socket.IO behind nginx delivers messages, typing, presence and read receipts live. Sockets sign in with the Java token and reconnect by themselves.
- **Organization system:** the app is built around teams. The backend enforces the roles (admin, member, viewer) and the invitations, and the Teams and Colleagues screens show each control only to those allowed to use it.
- **Public API:** other tools can work with the tasks. `/public/workspaces`, and GET, POST, PUT and DELETE on `/public/tasks`, take an `X-API-Key` header, are rate limited and are listed in Swagger. The key is stored as a SHA-256 hash, and Settings creates, replaces and revokes it.
- **Monitoring:** to see that every service is up. Prometheus scrapes the Java API, the chat service, the PostgreSQL and NGINX exporters and cAdvisor, and Grafana (`/grafana`) has six dashboards: two built for Team-Pulse and four imported from grafana.com.
- **Advanced analytics dashboard:** a team sees its progress at a glance. `/workspaces/{id}/stats` counts with SQL queries, and the dashboard adds filters, a custom date range, PDF export and live reloads.
- **ORM:** objects instead of raw SQL. JPA entities and Spring Data repositories over the Flyway schema in the Java API, and Prisma in the chat service.
- **Notification system:** people learn what concerns them. The backend saves a notification for every create, update and delete and publishes it on Redis, and the chat service pushes it to the bell.
- **OAuth 2.0:** sign in without a new password. The frontend gets an ID token from Google, and the backend checks it and answers with the app's own tokens.
- **Custom-made design system:** one look, and one place to change a colour: 12 tokens in `frontend/src/index.css`, and shared components (Button, Badge, Field, Modal, PageHeader and others) on every screen except the chat, which keeps its own styles.
- **Support for additional browsers:** evaluators do not all use Chrome. The main flows pass in Chrome, Safari 26.6 and Firefox 156, driven by `safaridriver` and `geckodriver`, with a clean console. Only the date formats differ.
- **Data export and import:** tasks move in and out as CSV or JSON. An import is limited to 2 MB and 500 rows, every field is validated, and spreadsheet formulas are neutralised.
- **User activity analytics dashboard:** what each person does: the assigned, done, in progress and to do tasks and the completion rate of each member.
- **GDPR compliance:** people own their data. Download my data saves everything stored about you in one file: the backend's export (`GET /users/me/export`) and your chat rooms and messages from the chat service (`GET /api/chat/me/export`). Deleting an account anonymizes it and blanks its chat messages, and both send an email. The Privacy Policy says what is stored.
- **Backend as microservices:** chat has different needs from the API, so the Java API and the Node chat service run as separate containers that talk over REST and Redis events.
- **Real-time collaborative features:** a team works on the same board at the same time. After a change, the chat service pushes `data:changed` to the people affected, and their pages refetch quietly, without closing an open form.

## Individual Contributions

### moben-ta

- The Spring Boot backend: accounts (email codes, Google sign-in, password reset, rotating refresh tokens), teams, roles and invitations, tasks, notifications, the public API and GDPR.
- Security: fixes for stored XSS and a timing attack, upload checks, rate limits, a CSP, Docker secrets, only nginx published, and secrets generated by `make`.
- Monitoring with Prometheus and Grafana, and the merge of every branch into main.
- Challenges: the 8 October merge had to reconcile branches written in parallel, including two versions of the entities and the schema. The dashboard counts loaded whole task lists into memory, so they became SQL group-by queries.

### ouzouini


- Designed the PostgreSQL database schema: users, teams, members, tasks, invitations, notifications, activity logs, API keys and tokens.
- Implemented the JPA entities that map each table to the application's domain model.
- Defined the enumerations used by the entities, such as roles, task statuses and priorities.
- Created the DTOs that carry data between the API and its clients.
- Implemented the custom exceptions used for consistent error handling across the backend.
- Challenges: Managing multiple Flyway versions during development can make database changes more complex. Since the application is not deployed yet, I kept only `V1__init_schema.sql`. After deployment, I will use new versions to update the database without losing existing data.

### szemmour

- The frontend core, every screen except the chat, the bell and the dashboard charts: sign up, sign in, password reset, teams, colleagues and invitations, the task board, settings and the legal pages.
- `lib/api.js` (the token on every request, renewed before it expires), the live updates (`lib/realtimeNotify.js`, `useDataChanged`), and the CSV task import and export.
- Modules: the design system and the browser support, and the frontend half of Frameworks, Organization system, OAuth, Public API, GDPR and collaboration.
- Team work: reviewed and merged pull requests, kept the status page, and sent bugs to their owners.
- Challenges: 334 hand-written colours in 26 files became 12 tokens. Expired tokens printed red console errors, so tokens now renew a minute early, and two tabs never renew at the same moment. Live refetches closed open forms until they were made quiet.

### ayaarab

- The chat service in Node.js, Express, Socket.IO and Prisma: group rooms, direct messages with requests, invitations, typing, read receipts, presence, and editing, deleting and searching messages.
- The chat screens (`features/chat`), and a socket that reconnects by itself after an outage, an expired token or a refused handshake.
- The `data:changed` relay for live updates, sent only to members of the team, and the chat service's place in Docker Compose and nginx, with Prometheus metrics at `/metrics`.
- Security: the Java API decides who is signed in, old tokens stop working after a password change, rate limits on every socket event, size and type checks on every input, and error codes instead of internal messages. A pending DM request cannot read the room.
- Accounts and GDPR: a deleted account becomes Deleted User, its messages are blanked, and the same email can sign up again. Download my data includes your chat rooms and messages.
- Several chat instances: users are reached through Socket.IO rooms over the Redis adapter, so live updates and revoked sessions work across instances.
- Challenges: chat rejected every Java token until the JWT secret was decoded as base64, the way Java does. One `null` sent over a socket crashed the service for everyone, so every handler now checks its input. A refused reconnect left the bell and the board listening to a dead socket until the same socket was revived. All users shared one Java rate limit until each user's IP was passed on.

### mel-adna

- Product Owner: keeps the project scope and priorities.
- Advanced analytics dashboard: status and priority charts, per-member activity, filters, a custom date range and PDF export, on top of `/workspaces/{id}/stats`.
- User activity analytics dashboard: the Team Member Activity table with each member's assigned, done, in progress and to do tasks and completion rate.
- The notification system frontend, shared with moben-ta: the bell, the unread count, real-time notifications, and mark as read and mark all as read.
- Task import and export as CSV and JSON, shared with szemmour, with the checks on import.
- Challenges: the dashboard numbers were computed twice, in the browser and in the backend, so the browser copy was removed. The PDF export printed console errors while embedding fonts, so it now skips font embedding.
