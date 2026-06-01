# 🎮 ft_transcendence — Team Pulse Workspace
### 🐳 Secure Multi-Container Multiplayer Pong Game, Real-Time Chat & Analytics Platform

Welcome to the **Team Pulse** workspace, a complete, modern single-page web application built for the **`ft_transcendence`** project. 

This platform orchestrates a secure multi-container microservice system running a live multiplayer Pong game, user match histories, interactive chat rooms, and real-time sprint analytics.

---

## 🗺️ Project Scope & Core Modules

The system is designed as a secure, distributed microservice architecture. It is divided into 5 specialized developer roles:

| Module Area | Developer | Technical Stack | Status |
| :--- | :--- | :--- | :--- |
| **🌐 DevOps & Reverse Proxy** | **Member 5** *(You)* | Nginx, Docker, OpenSSL, TLS 1.3 | **✔️ Hardened & Core SSL Terminal Active** |
| **📊 Analytics & Data Science** | **Member 5** *(You)* | Node.js, Express, Recharts, REST APIs | **✔️ Fully Implemented & Responsive** |
| **🔑 Auth & User Profiles** | **Member 1 & 2** | *To be integrated* (e.g., JWT, OAuth 2.0) | 🔌 Pending Integration |
| **💬 Live Chat & Channels** | **Member 3** | *To be integrated* (e.g., WebSockets, Redis) | 🔌 Pending Integration |
| **🎮 Multiplayer Pong Game** | **Member 4** | *To be integrated* (e.g., Canvas, WebSockets) | 🔌 Pending Integration |

---

## 🏗️ System Architecture

Our platform leverages **Docker Compose** to coordinate distinct containerized services communicating inside an isolated, private virtual network called `teampulse_net`. External clients communicate strictly via secure HTTPS through **Nginx** as the single gateway.

```
                           [ CLIENT BROWSER ]
                                   │
                         ( Secure HTTPS - 443 )
                                   │
                                   ▼
                       ┌──────────────────────┐
                       │  team_pulse_nginx    │
                       └──────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │ (Internal HTTP)        │ (Internal HTTP)        │ (Internal WebSockets)
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  team_pulse_     │    │  team_pulse_     │    │   Future Team    │
│  frontend        │    │  backend         │    │   Microservices  │
│  (React/Vite SPA)│    │  (Member 5 API)  │    │ (Auth, Chat, Game)│
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Key Shared Architecture Highlights:
* **Global SSL/TLS termination**: Handled dynamically at the Nginx gateway, ensuring all internal microservices communicate in a safe, standard production environment.
* **Unified Domain & Origin**: By routing all paths (`/` for UI, `/api` for stats, and future services) through Nginx on Port 443, the entire system runs on the same host address, eliminating cross-origin browser issues (CORS).
* **Cyber-Hardening Policies**: Built-in HTTP response headers protect all services globally against **Clickjacking** (`X-Frame-Options`), **MIME-Sniffing** (`X-Content-Type-Options`), **Reflected Script Injections** (`X-XSS-Protection`), and **Session Hijacking** (HSTS).

---

## 🚀 Getting Started

Follow these steps to generate cryptographic keys and run the entire unified platform locally in seconds:

### Prerequisite: Install Docker & OpenSSL
Ensure you have Docker Desktop and OpenSSL installed on your host system.

### Step 1: Generate Local SSL Certificates
Run the automated secure SSL helper script at the root of the project to create your local TLS credential key pair:
```bash
./generate_certs.sh
```

### Step 2: Spin Up the Containers
Launch the multi-container environment via Docker Compose:
```bash
docker-compose up --build
```

### Step 3: Access the Platform
* **💻 Web Application Gateway**: Open `https://localhost/` in your browser.
  *(Note: Since this is local development utilizing self-signed certificates, accept the browser warning to proceed to the main dashboard).*
* **🔌 Secure Public API (Analytics)**:
  * Health check: `https://localhost/api/health`
  * Dashboard JSON Metrics: `https://localhost/api/stats/summary` *(Requires API Key)*
  * CSV Task Exporter: `https://localhost/api/stats/export/tasks?apiKey=team_pulse_public_api_secret_token`

---

## 📈 Member 5 (Analytics & DevOps) Features

Your workspace comes fully pre-packaged with our initial **Analytics Dashboard** UI and API endpoints matching the approved mockups:
* **Dynamic Visualizations (Recharts)**: High-fidelityAreaCharts mapping long-term tasks completions on desktop, transitioning into custom Friday-highlighted BarCharts on mobile viewports.
* **Dual-Viewport Layouts**: Fully responsive structural toggle switching between a lock left sidebar navigation on desktop and a floating pinned navigation tray on mobile viewports.
* **Safe CSV Streams**: Server-side in-memory compiler compiling database assets into clean downloadable spreadsheets via HTTP attachments.
* **API Security Layers**: Built-in authorization headers (`x-api-key`) and robust IP-based Rate-Limiting middleware (`express-rate-limit`) preventing brute force scraping and DoS.

---

## 🤝 Team Developer Onboarding & Guides

To keep our Git workflow clean and ensure seamless integration of your own modules:

* **Teammates (Members 1, 2, 3, and 4)**: Please read **[COLLABORATION.md](file:///Users/macbookair/Desktop/ft_transcendence/COLLABORATION.md)** for a complete step-by-step tutorial on how to register your service containers, configure environment tunnels, map proxy routes in the Nginx config, and connect real-time WebSocket streams safely.
* **DevOps / Member 5 Defense Details**: If you are reviewing the DevOps or Analytics architecture for evaluation prep, please read **[EVALUATION_PREP.md](file:///Users/macbookair/Desktop/ft_transcendence/EVALUATION_PREP.md)** for a comprehensive question bank and technical deep-dives.
