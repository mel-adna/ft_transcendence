# 📊 Team-Pulse Dashboard (ft_transcendence DevOps & Analytics)
### 🐳 Secure Multi-Container Microservice Platform with SSL Reverse Proxy

---

## 📖 Introduction
This repository houses the complete DevOps foundation and **Member 5 (Analytics & Data Science)** services for the **Team-Pulse Workspace** (`ft_transcendence` project). 

To ensure complete modular independence and prevent code-level conflicts during team collaboration, all other member subsystems (Auth, Chat, Pong Game backend) have been intentionally purged. This clean state provides our teammates with a hardened, pre-configured DevOps environment that they can easily plug their own services into.

---

## 🧱 Key Architectural Highlights
* **Nginx SSL Termination Gateway**: Routes secure external HTTPS traffic (`Port 443`) internally as unencrypted HTTP to containers, using local RSA self-signed certificates.
* **Cyber-Hardening Protection**: Applies HSTS session security, X-Frame-Options against Clickjacking, nosniff headers against MIME-sniffing, XSS browser shields, and restricted Content Security Policies (CSP) globally.
* **Express Trust-Proxy Rates & Auth**: Implements IP-based request rate limiting (60 requests per 15 minutes) and header-based API key authentication (`x-api-key`), correctly tracking external user IPs through proxy headers.
* **Dual-Responsive Adaptive UI**: Renders a dynamic, glassmorphic layout switching between a Left Sidebar navigation (on desktop) and a Bottom Navigation tab bar (on mobile), with responsive completion charts and activity trackers.

---

## 📂 Project Structure Map

```text
├── .env.example              # Environment parameter templates
├── .gitignore                # Industry-standard git untracked files block
├── COLLABORATION.md          # Team integration guide (How other members plug in)
├── EVALUATION_PREP.md        # Comprehensive 1337 defense Q&A guide
├── README.md                 # Project landing documentation
├── docker-compose.yml        # Multi-container service orchestrator
├── generate_certs.sh         # Automated local SSL certificate creator
│
├── nginx/
│   ├── nginx.conf            # Proxy paths, SSL protocols & Security headers
│   └── certs/                # Local development SSL credential directory (git-ignored)
│
├── backend/
│   ├── Dockerfile            # Alpine-based Node 22 API container
│   ├── package.json          # Express, Cors, and Rate-limiting libraries
│   └── src/
│       ├── app.js            # CORS, proxy trusts, and security middleware
│       ├── routes/           # REST endpoint paths
│       └── controllers/      # KPI metrics calculations & CSV dynamic builders
│
└── frontend/
    ├── Dockerfile            # Alpine-based React Vite client container
    ├── package.json          # Tailwind CSS v4, Lucide Icons, and Recharts SVG libraries
    ├── vite.config.js        # Build bindings and proxy configurations
    └── src/
        ├── App.jsx           # Main responsive viewport toggle layout
        └── features/
            └── dashboard/    # Recharts metrics, bar/area trends & feeds
```

---

## 🚀 1. Quick Start Guide (Run Locally in Seconds)

Follow these two simple commands to build and run the entire secure stack:

### Step 1: Generate Local SSL Certificates
Run the automated SSL script in your terminal to create your self-signed key pair locally:
```bash
./generate_certs.sh
```

### Step 2: Boot the Containers
Launch the multi-container environment via Docker Compose:
```bash
docker-compose up --build
```
Docker will pull the optimized Alpine packages, compile your custom Node.js v22 images, spin up the private virtual bridge network, and activate the secure proxy.

---

## 🎯 2. Workspace Access Points
Once the containers are active:
* **💻 Secure Web Frontend UI**: Access `https://localhost/` inside your browser. 
  *(Note: Since we use self-signed certificates for local development, accept the browser warning to enter the dashboard).*
* **🔌 Secure Public API (Member 5)**: Access the API endpoints routed through Nginx:
  * Health Endpoint: `https://localhost/api/health`
  * Dashboard Stats: `https://localhost/api/stats/summary` *(Requires API Key)*
  * CSV Task Exporter: `https://localhost/api/stats/export/tasks?apiKey=team_pulse_public_api_secret_token`

---

## 📈 3. Developer Verification Tools

To inspect response packets and check that cybersecurity headers are active, run the following curl check in your terminal:
```bash
curl -i -k https://localhost/api/health
```

### Expected Output Headers:
```http
HTTP/1.1 200 OK
Server: nginx/1.26.2
Connection: keep-alive
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

---

## 🤝 4. Team Contributions
For other members of our team, please read **[COLLABORATION.md](file:///Users/macbookair/Desktop/ft_transcendence/COLLABORATION.md)** for a detailed, step-by-step technical guide on how to register your service containers, map proxy locations in Nginx, connect WebSocket tunnels, and align with our security policies.
