# Evaluation Preparation Guide - ft_transcendence
### DevOps (Docker & Nginx) and Member 5 (Data Analytics Subsystem)

This guide provides deep technical details to prepare for peer-evaluation and staff reviews. It covers the operational mechanisms, security configurations, and design rationale behind the DevOps architecture and the Member 5 subsystem.

---

## 1. System Topology and Request Flow

The application coordinates services using an isolated virtual Docker network. Nginx serves as the single gateway for all client traffic:

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
│  team_pulse_     │    │  team_pulse_     │    │   Future Team    │
│  frontend        │    │  backend         │    │   Microservices  │
│  (React/Vite)    │    │  (Member 5 API)  │    │ (Auth, Chat, Game)│
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. DevOps and Multi-Container Dockerization

### Containerization vs. Virtualization
* **Core Concept**: Docker containers package application code, system libraries, and runtime dependencies into isolated user-space processes running directly on the host OS kernel.
* **Comparison with VMs**: Virtual Machines require packaging a complete guest operating system, virtual hardware, and a hypervisor layer, incurring high CPU and memory overhead. Containers share the host kernel, booting instantly and consuming minimal system resources.
* **Project Benefit**: Using Docker ensures that the environment is identical across all development, testing, and evaluation environments, eliminating local runtime conflicts.

### Multi-Container Architecture in `docker-compose.yml`
The system coordinates three containers inside a private bridge network (`teampulse_net`):
1. **Nginx gateway (`team_pulse_nginx`)**: Operates on `nginx:stable-alpine`. Exposes host ports `80` and `443`. Maps configuration files and SSL certificates as read-only (`:ro`) to protect the host setup.
2. **React Frontend (`team_pulse_frontend`)**: Runs the React Single Page Application (SPA). Exposes Port `5173` internally. Uses the runtime environment variable `VITE_API_URL` to target secure endpoints.
3. **Express Backend (`team_pulse_backend`)**: Serves the Analytics API on Port `5005` internally.

### Node.js Run-time Environment and Vite CustomEvent Error
* **The Error**: During initial setup using Node.js v18-alpine, Vite v8 crashed immediately with a `ReferenceError: CustomEvent is not defined`. Vite v8 requires a runtime that supports web-standard events.
* **The Resolution**: Upgraded both `frontend/Dockerfile` and `backend/Dockerfile` to **`node:22-alpine`** (Active LTS), which natively implements the web-standard Event API and resolves the runtime error.

### Resolving Host Port Conflicts (Port 5000 to 5005)
* **The Conflict**: macOS reserves Port `5000` for its internal AirPlay Receiver service. Attempting to bind a developer container to Port `5000` on macOS results in a `Bind for 0.0.0.0:5000 failed: port is already allocated` or `EADDRINUSE` error.
* **The Resolution**: The backend API service, Docker network mappings, and Nginx proxy targets were reconfigured to Port **`5005`**.

---

## 3. Nginx Reverse Proxy, SSL Termination, and Hardening

### SSL Termination Logic
Nginx handles SSL/TLS termination at the boundary of the private network. The client browser communicates securely via HTTPS to Nginx on Port 443. Nginx decrypts the packets and routes them to the targeted backend or frontend containers as standard HTTP. This design keeps container runtimes lightweight and avoids the overhead of internal container encryption.

### Self-Signed Certificate Generation
To support local HTTPS, a self-signed SSL certificate is generated using OpenSSL:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=MA/L=Khouribga/O=1337School/CN=localhost"
```
* `-x509`: Specifies a self-signed certificate structure.
* `-nodes`: Short for "no DES". It prevents encrypting the private key with a passphrase, allowing Nginx to read the key automatically on boot without prompt.
* `-newkey rsa:2048`: Generates a secure 2048-bit RSA key pair.
* `selfsigned.crt` is the public certificate (sent to the client browser).
* `selfsigned.key` is the private key (remains strictly locked inside Nginx).

### Solving the Nginx DNS IP Caching Bug
* **The Problem**: In Docker Compose, containers are assigned dynamic IPs (e.g. `172.18.0.3`) when a network is initialized. If you modify and rebuild a container (e.g. backend), Docker assigns it a *new* IP. However, on startup, Nginx resolves the hostname `backend` to its IP **once** and caches it. When backend gets a new IP, Nginx keeps hitting the cached old IP, causing an instant `502 Bad Gateway` or `Connection Refused` error.
* **The Fix**: 
  1. We registered Docker's internal DNS daemon resolver:
     ```nginx
     resolver 127.0.0.11 valid=5s;
     ```
  2. Instead of writing `proxy_pass http://backend:5005;` directly, we declared variable bindings:
     ```nginx
     set $backend_upstream http://backend:5005;
     proxy_pass $backend_upstream;
     ```
     By passing a **variable** to `proxy_pass`, Nginx is forced to bypass static resolution and query the Docker DNS resolver at `127.0.0.11` every 5 seconds, updating dynamically without needing an Nginx reload!

### HTTP Hardening Headers
Nginx is configured to inject five security headers inside all HTTP responses:
1. **`Strict-Transport-Security` (HSTS)**: Forces client browsers to only connect via HTTPS for 1 year (`max-age=31536000`), mitigating SSL-stripping and MITM attacks.
2. **`X-Frame-Options` (`SAMEORIGIN`)**: Restricts other sites from embedding the web pages inside an `<iframe>`, preventing **Clickjacking** attempts.
3. **`X-Content-Type-Options` (`nosniff`)**: Forces the browser to strictly follow the declared Content-Type header, preventing **MIME-sniffing exploits** (e.g., executing uploaded CSV text files as executable scripts).
4. **`X-XSS-Protection` (`1; mode=block`)**: Re-enforces built-in browser filters to detect and block reflected cross-site scripting (XSS) attacks.
5. **`Content-Security-Policy` (CSP)**: resticts resources (scripts, styles, images) to trusted origins. Scripts and styles are limited to the domain itself (`'self'`), fonts are loaded safely, and images are strictly allowed from `'self'` and `https://images.unsplash.com` (for our timeline avatars).

---

## 4. Member 5: Data, Analytics, and API Architecture

### REST Endpoints
* `GET /api/stats/summary`: Returns sprint metadata (total tasks, status breakdown, and active colleague counts) in JSON format.
* `GET /api/stats/export/tasks`: Compiles database records into a comma-separated format and streams the response directly as a downloadable file attachment.

### Memory-Buffered CSV Streaming
To prevent server-side disk wear and ensure performance, task records are compiled dynamically in the backend RAM buffer and streamed to the client via HTTP:
```javascript
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename=organization_tasks.csv');
res.status(200).send(csvContent);
```
* `Content-Type: text/csv` signals the browser that the response payload is a spreadsheet.
* `Content-Disposition: attachment` instructs the browser to trigger a local file download dialog instead of rendering raw text inside a tab.

### API Security Implementation
* **API Key Authorization**: Requests to analytics endpoints must present a valid `x-api-key` header (or `apiKey` query parameter for downloads). Requests without a matching key are blocked with a `403 Forbidden` response.
* **API Rate Limiting**: The system limits requests from each distinct IP address to a maximum of **60 requests per 15 minutes** (`express-rate-limit`). Over-limit requests are blocked with a `429 Too Many Requests` status.

### Trusting the Reverse Proxy In Express
* **The Problem**: When Express sits behind a reverse proxy (like Nginx), Nginx forwards client requests to the backend. From Express's perspective, *all* requests originate from Nginx's internal container IP (e.g. `172.18.0.2`). If you configure a rate limiter without telling Express to trust the proxy, **Express will rate-limit Nginx's IP!** If one active user hits the site 60 times, the Nginx IP gets blocked, **locking out every single user globally!**
* **The Fix**: 
  ```javascript
  app.set('trust proxy', 1);
  ```
  This tells Express to trust the first proxy hop, looking instead at the `X-Forwarded-For` HTTP header (injected by Nginx) to extract the true client IP for rate-limiting.

---

## 5. Peer-Evaluation Defense Q&A

### Q1: Why use Nginx as a reverse proxy instead of exposing the Node.js port directly to the host?
* **Answer**: Nginx isolates the internal services. It acts as a single gateway that handles SSL/TLS termination, static file routing, compression, and request forwarding. Exposing internal Node.js runtimes directly to the host exposes them to attacks. Nginx allows us to manage security policies and scales without editing the application logic.

### Q2: What is SSL Termination, and why is it used?
* **Answer**: SSL termination decrypts incoming HTTPS traffic at the Nginx gateway and routes it internally to the application containers as standard HTTP over the secure Docker virtual bridge network. This reduces CPU load on individual application containers by offloading cryptographic handshakes to Nginx, keeping microservices fast and simple.

### Q3: What vulnerability does X-Frame-Options mitigate?
* **Answer**: It prevents Clickjacking attacks, where malicious sites overlay transparent or invisible frames on top of our application to trick users into executing actions (like clicking buttons). Setting `SAMEORIGIN` forces browsers to only render our site inside frames if the framing page has the exact same domain.

### Q4: Why is the `trust proxy` setting mandatory for rate-limiting middleware in container networks?
* **Answer**: Because Express sits behind Nginx, all incoming requests appear to originate from Nginx's internal IP. If we do not explicitly instruct Express to trust the proxy, the rate limiter will aggregate all traffic under Nginx's IP. One client exceeding the request rate limit would trigger a lockout for the proxy, blocking access to all users globally. Enabling `trust proxy` forces the server to parse the `X-Forwarded-For` header to determine individual client IPs.

### Q5: How do CORS rules behave under this reverse proxy configuration?
* **Answer**: Since Nginx proxies both the frontend (served on the root `/`) and the backend (served on `/api`) under the same host domain and port, the browser perceives them as running on the same origin. This completely bypasses CORS restrictions, eliminating the need to allow wildcard origins on backend servers.

---

## 6. Evaluation Verification Walkthrough

1. **Build and Boot the System**:
   Ensure all containers build and launch cleanly:
   ```bash
   docker-compose down && docker-compose up --build
   ```

2. **Verify HTTP to HTTPS Redirects**:
   Query the server on Port 80 and check that Nginx issues a `301 Moved Permanently` redirect to Port 443:
   ```bash
   curl -i http://localhost
   ```

3. **Verify Cybersecurity Headers**:
   Send an API query and check that Nginx appends all five required headers (HSTS, Clickjacking, MIME checks, XSS, CSP):
   ```bash
   curl -i -k https://localhost/api/health
   ```

4. **Test Rate Limiter Triggering**:
   Send more than 60 rapid requests and verify that the API returns a `429 Too Many Requests` status code.

5. **Test CSV Spreadsheet Downloads**:
   Trigger a CSV dynamic export query and verify that the file download header is present:
   ```bash
   curl -i -k "https://localhost/api/stats/export/tasks?apiKey=team_pulse_public_api_secret_token"
   ```
   Check that `Content-Type: text/csv` and `Content-Disposition: attachment` are returned.
