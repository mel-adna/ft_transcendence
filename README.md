# Team-Pulse Dashboard - ft_transcendence Project Specification

This repository contains the core codebase, DevOps environment, and multi-container orchestration for the Team-Pulse Dashboard project. 

---

## 1. Project Vision

### Project Name
Team-Pulse Dashboard

### Idea
A collaborative task-management platform designed for teams to manage tasks, communicate in real-time, and track performance through analytics.

### The Problem
Modern teams often utilize multiple disconnected tools, leading to poor organization, fragmented communication, and scattered performance metrics.

### The Solution
A unified, high-performance platform combining:
* Task management and organizational grouping.
* Real-time team communication.
* Performance tracking and data analytics.

---

## 2. Core Features (MVP - Mandatory Part)

The development lifecycle enforces a strict rule: **No bonus features until all mandatory MVP features are complete and verified.**

### A. Authentication and User Management
* **JWT Authentication**: Secure signup and login flows utilizing JSON Web Tokens.
* **Profile Management**: Capabilities to update user details (name, email).
* **Avatar Upload**: Support for custom user profile images.
* **Online Presence Status**: Live tracking of user online/offline status using WebSocket connectivity or last-seen timestamps.
* **Legal Compliance**: Accessible Privacy Policy and Terms of Service documents linked in the global footer.

### B. User Interaction
* **Colleagues System**: Functionality to add or remove users and view a unified colleagues directory.
* **Chat System**: Real-time message dispatching and reception, with permanent message archiving in the relational database.

### C. Task and Organization
* **Organization System**: Structural grouping of users into distinct teams, ensuring strict data isolation per organization.
* **Task CRUD Operations**: Complete Create, Read, Update, and Delete actions for tasks with structured states: To-Do, Doing, and Done.

### D. Data and Analytics
* **Dashboard Visualizations**: Interactive data charts monitoring task statuses and completion trends.
* **Export and Import**: Dynamic CSV spreadsheet loading and extraction.
* **GDPR Compliance**: Dedicated mechanisms allowing users to download their complete personal data or permanently delete their account.

### E. Technical and Security Requirements
* **Enforced HTTPS**: All external traffic is terminated over secure HTTPS connections.
* **Hardened Public API**: Exposes five secure, rate-limited endpoints requiring API keys:
  * `/api/tasks`
  * `/api/users`
  * `/api/organizations`
  * `/api/stats`
  * `/api/chat`
* **Quality Assurance**: Zero browser console errors and absolute layout integrity.

---

## 3. Technology Stack

* **Frontend**: React (Vite), Tailwind CSS, Axios, Socket.io-client
* **Backend**: Node.js, Express, Socket.io, JWT, Multer, express-rate-limit
* **Database & ORM**: PostgreSQL, Prisma ORM
* **DevOps**: Docker, Nginx (acting as the secure HTTPS reverse proxy)
* **Development Tools**: GitHub, Postman

---

## 4. Project Architecture

The application implements a standard three-tier architecture:

```
[ Client (React) ] <---> [ API Server (Express + Socket.io) ] <---> [ Database (PostgreSQL) ]
```

---

## 5. File Structure

```text
/project-root
│── docker-compose.yml
│── .env
│── .env.example
│── README.md
│── nginx/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── utils/
│   │   ├── config/
│   │   └── app.js
│   └── prisma/
│       └── schema.prisma
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── features/
    │   │   ├── auth/
    │   │   ├── tasks/
    │   │   ├── chat/
    │   │   ├── dashboard/
    │   │   └── organization/
    │   ├── hooks/
    │   ├── services/
    │   ├── context/
    │   └── App.jsx
```

---

## 6. Team Division (Layer-Based)

The project enforces strict feature ownership to prevent development conflicts:

### Member 1 — Backend Core (Auth & Security)
* **Responsibilities**: JWT Authentication, profile and password management, API security (API key authorization and rate limiting), and GDPR compliance endpoints.
* **Files Owned**:
  * `backend/src/controllers/authController.js`
  * `backend/src/routes/authRoutes.js`
  * `backend/src/middleware/auth.js`
  * `backend/src/middleware/rateLimit.js`
  * `backend/src/controllers/userController.js`

### Member 2 — Database & ORM
* **Responsibilities**: Database schema design, relational mappings (users, organizations, tasks, messages), and SQL query optimizations.
* **Files Owned**:
  * `backend/prisma/schema.prisma`
  * `backend/src/services/databaseService.js`

### Member 3 — Frontend Core (UI/UX)
* **Responsibilities**: Core application pages (Authentication, Dashboard, Task boards), reusable UI elements, and styling.
* **Files Owned**:
  * `frontend/src/pages/`
  * `frontend/src/components/`
  * `frontend/src/features/auth/`
  * `frontend/src/features/tasks/`

### Member 4 — Real-Time System (Chat & Presence)
* **Responsibilities**: WebSocket server configurations, real-time message tunnels, and online status monitors.
* **Files Owned**:
  * `backend/src/sockets/chatSocket.js`
  * `backend/src/controllers/chatController.js`
  * `frontend/src/features/chat/`

### Member 5 — Analytics & Data
* **Responsibilities**: Analytical dashboard charts, stats endpoints, and CSV export/import mechanics.
* **Files Owned**:
  * `backend/src/controllers/statsController.js`
  * `backend/src/routes/statsRoutes.js`
  * `frontend/src/features/dashboard/`

---

## 7. Workflow Rules

### Git and Code Contributions
* **Branching**: Develop each feature on an isolated feature branch based on main.
* **Commit Guidelines**: Provide clear, semantic commit messages.
* **Code Review**: A Pull Request and peer review are mandatory prior to merging code into the main branch.

### Environment Management
* Keep all secret credentials, private tokens, and configuration values inside the `.env` file (never commit this file to git).
* Document empty parameter structures inside `.env.example` for teammate alignment.

### Deployment & Local Development
Launch the complete containerized stack using the following orchestration command:
```bash
docker-compose up --build
```

---

## 8. Quality Control Standards

* Zero browser console errors.
* Consistent, clean user interface implementation.
* Complete validation on both the frontend input layer and the backend API controller layer.

---

## 9. Bonus Strategy

The following features will only be explored after the core MVP mandatory requirements are completed and verified:
* Multi-language support (i18n).
* Right-to-Left (RTL) layout rendering.
* Advanced system-wide search functionality.
* Real-time browser notifications.
* Custom, cohesive design system tokens.
