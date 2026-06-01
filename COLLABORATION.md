# Team Integration and Collaboration Guide
### DevOps, Multi-Container Orchestration, and Shared Network Guidelines

This workspace is equipped with a fully operational, secure, and responsive containerized platform as mandated by the ft_transcendence subject specifications.

To prevent directory conflicts and allow independent choice of development stacks (Node.js, Python, Go, Ruby, etc.) for other team members, the repository currently contains the DevOps (Nginx SSL Termination) and Member 5 (Analytics API and Dashboard UI) modules.

This document details the architecture and provides a technical blueprint on how to integrate other services (Authentication, Chat, Game Backend) into the shared platform.

---

## 1. System Topology and Proxy Configurations

All microservices communicate internally within an isolated, private virtual network managed by Docker. Nginx handles all external entry and egress.

```
                           [ Client Browser ]
                                   │
                           ( HTTPS - Port 443 )
                                   │
                                   ▼
                       ┌──────────────────────┐
                       │  team_pulse_nginx    │
                       └──────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │ (Internal HTTP)        │ (Internal HTTP)        │ (WebSockets / HTTP)
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  team_pulse_     │    │  team_pulse_     │    │  [YOUR SERVICE]  │
│  frontend        │    │  backend         │    │  (e.g., Chat,    │
│  (React/Vite)    │    │  (Member 5 API)  │    │   Game, Auth)    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Shared Platform Infrastructure:
1. **SSL Termination**: Clients establish encrypted connections via HTTPS on Port 443. Nginx decrypts incoming packets and forwards them to internal containers as unencrypted HTTP.
2. **Unified Origin**: By routing the frontend and all API requests through the same Nginx proxy on Port 443, the application runs on a single origin, avoiding cross-origin (CORS) security issues.
3. **HTTP Hardening Headers**: Strict security headers are configured globally at the Nginx level. Integrated services automatically benefit from:
   * **Clickjacking Protection** (`X-Frame-Options: SAMEORIGIN`)
   * **MIME-Sniffing Prevention** (`X-Content-Type-Options: nosniff`)
   * **Session Security / SSL Stripping Defense** (`Strict-Transport-Security` / HSTS)
   * **Cross-Site Scripting Mitigation** (`X-XSS-Protection` & `Content-Security-Policy`)

---

## 2. Technical Integration Workflow

Follow these steps to integrate a new microservice (e.g., Authentication, Chat, or Pong Game) into the existing stack:

### Step 1: Initialize the Service Directory
Create a dedicated subdirectory at the root level for your service:
```bash
mkdir backend-auth
```
Maintain all dependencies, runtimes, and source code isolated within this folder.

### Step 2: Configure the Service Dockerfile
Create a `Dockerfile` inside your service directory to specify the build and runtime parameters. Example (Node.js microservice):
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

### Step 3: Register the Container in `docker-compose.yml`
Open `docker-compose.yml` and declare your service container under the `services` block.

> [!IMPORTANT]
> **Do not bind external host ports (e.g., `ports: - "8000:8000"`)**.
> To preserve the security boundary of the platform, the container should only be accessible internally via Nginx. Connect the service to the shared network `teampulse_net`.

Example configuration block:
```yaml
  auth-service:
    build:
      context: ./backend-auth
      dockerfile: Dockerfile
    container_name: team_pulse_auth
    environment:
      - PORT=8000
      - NODE_ENV=development
    networks:
      - teampulse_net
    restart: always
```

### Step 4: Map the Routing Paths in `nginx/nginx.conf`
Configure Nginx to route external requests to your service. Open `nginx/nginx.conf`, locate the `server { listen 443 ssl; ... }` block, and define a proxy location.

**For Standard HTTP APIs**:
```nginx
        # Member 1: Authentication & User API Proxy
        location /api/auth {
            set $auth_upstream http://auth-service:8000;
            proxy_pass $auth_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
```

**For Real-Time WebSockets (e.g., Chat or Pong Game Backend)**:
If your service relies on WebSocket connections (such as Socket.io or native WebSockets), Nginx must handle connection upgrades:
```nginx
        # Member 3 & 4: Live Chat & Game WebSockets Gateway
        location /socket.io {
            set $chat_upstream http://chat-service:9000;
            proxy_pass $chat_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
```

### Step 5: Build and Run
Rebuild the Docker Compose stack to build the new image and run the services:
```bash
docker-compose down && docker-compose up --build
```
Your service is now securely exposed at `https://localhost/api/auth` (or `/socket.io`).

---

## 3. Mandatory Security Guidelines for Integrated Services

To pass the strict security audit requirements of the school evaluation, integrated services must comply with the following rules:

1. **Proxy Trust and Client IP Resolution**:
   Because all services sit behind Nginx, standard logger systems see the Nginx internal gateway IP (`172.18.0.x`) rather than the user's internet IP.
   * If you implement authentication loggers, session tracking, or rate limiters, you must trust the proxy.
   * In Node.js Express, call `app.set('trust proxy', 1);` on boot.
   * Always read the client IP from the forwarded header: `req.headers['x-forwarded-for']`.

2. **Environment Variable Security**:
   * Never hardcode credentials, private tokens, or database keys inside source code files.
   * Store them inside the root `.env` file (which is git-ignored).
   * Register empty placeholders inside `.env.example` to let other team members know what keys are needed.

3. **Dynamic Upstream Resolving**:
   * Write all new Nginx location targets using variables (e.g., `set $target http://service:port; proxy_pass $target;`).
   * This forces Nginx to query the Docker DNS resolver (`127.0.0.11`) dynamically, preventing `502 Bad Gateway` crashes when containers are restarted or redeployed during live work.

---

## 4. Operational Commands Cheat Sheet

* **Run the complete environment**:
  ```bash
  docker-compose up --build
  ```
* **Gracefully shut down all containers and networks**:
  ```bash
  docker-compose down
  ```
* **Inspect logs for a specific service**:
  ```bash
  docker-compose logs -f backend
  ```
* **Enter the terminal of a running container**:
  ```bash
  docker exec -it team_pulse_backend sh
  ```
