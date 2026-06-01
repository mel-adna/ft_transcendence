# Team Pulse Workspace - ft_transcendence
### Secure Multi-Container Architecture, Real-Time Systems, and Data Analytics

This repository contains the core DevOps infrastructure and the Analytics and Data Science subsystem (Member 5) for the Team Pulse workspace, developed as part of the ft_transcendence project.

To ensure modular isolation and allow independent stack selection (Node.js, Python, Go, etc.) for other team members, the workspace is provided in a clean state with pre-configured SSL routing and security policies.

---

## Project Structure and Developer Modules

The system is designed as a secure, distributed microservice architecture. It is divided into five specialized engineering modules:

| Module Area | Developer Focus | Implementation Stack | Status |
| :--- | :--- | :--- | :--- |
| **DevOps & Reverse Proxy** | DevOps Lead (Member 5) | Nginx, Docker Compose, OpenSSL, TLS 1.3 | Active |
| **Analytics & Data Science** | Data Analyst (Member 5) | Node.js, Express, Recharts, REST APIs | Active |
| **Authentication & Profiles** | Member 1 & Member 2 | Node.js / Go / Python (Pending Integration) | Pending |
| **Live Chat & Messaging** | Member 3 | WebSockets / Redis (Pending Integration) | Pending |
| **Multiplayer Game (Pong)** | Member 4 | WebSockets / Canvas (Pending Integration) | Pending |

---

## System Architecture

The platform utilizes Docker Compose to orchestrate isolated services running within a private virtual bridge network (`teampulse_net`). External client requests are securely routed through Nginx acting as a single reverse proxy gateway.

```
                           [ Client Browser ]
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

### Core DevOps and Infrastructure Features:
* **SSL Termination**: Encrypted HTTPS connections (Port 443) are terminated at the Nginx gateway, decapsulated, and forwarded as unencrypted HTTP over the internal Docker network.
* **Unified Host Origin**: Routing all paths (Frontend: `/`, Analytics: `/api`, and future endpoints) through Nginx resolves Cross-Origin Resource Sharing (CORS) constraints natively.
* **Security Hardening**: The Nginx configuration enforces strict HTTP headers globally, protecting all integrated microservices against Clickjacking, MIME-Sniffing, Reflected Cross-Site Scripting (XSS), and Session Hijacking.

---

## Setup and Installation

Follow these steps to generate the required cryptographic key pairs and run the platform locally:

### Prerequisites
Ensure that Docker, Docker Compose, and OpenSSL are installed on the host system.

### 1. Generate SSL Certificates
Execute the helper script at the root of the project to generate a secure self-signed key pair:
```bash
./generate_certs.sh
```

### 2. Launch the Platform
Build and launch the containerized services using Docker Compose:
```bash
docker-compose up --build
```

### 3. Service Access Points
Once the containers are operational, the following entrypoints will be available:
* **Web Frontend**: Access `https://localhost/` inside the browser (accept the self-signed certificate warning for local development).
* **API Health Check**: `https://localhost/api/health`
* **Analytics API**: `https://localhost/api/stats/summary` (Requires a valid API key header)
* **CSV Task Exporter**: `https://localhost/api/stats/export/tasks?apiKey=team_pulse_public_api_secret_token`

---

## Member 5 Features (Analytics & Data Science)

The subsystem is fully implemented and operational with the following capabilities:
* **Responsive Visualizations**: Renders continuous completion gradient charts (AreaChart) on desktop viewports and targeted daily metrics charts (BarChart) on mobile layouts.
* **Fluid Layout System**: Features an adaptive responsive grid that shifts between a pinned Left Sidebar on desktop and a fixed Bottom Navigation bar on mobile.
* **In-Memory CSV Streamer**: Compiles task data directly in the backend memory buffer and streams it as a CSV file attachment to minimize disk write overhead.
* **API Protection**: Hardened using API key checking (`x-api-key`) and IP-based rate limiting (`express-rate-limit`) to prevent unauthorized scraping and brute-force traffic.

---

## Onboarding and Documentation

To facilitate collaboration, the following dedicated documents are available:
* **Team Onboarding Guide**: Read [COLLABORATION.md](file:///Users/macbookair/Desktop/ft_transcendence/COLLABORATION.md) for step-by-step instructions on how to connect your services, configure proxy paths in Nginx, and manage WebSocket tunnels.
* **Evaluation Preparation Sheet**: Read [EVALUATION_PREP.md](file:///Users/macbookair/Desktop/ft_transcendence/EVALUATION_PREP.md) for a technical analysis of the DevOps configuration and comprehensive preparation questions for the peer-evaluation defense.
