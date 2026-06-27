
# Backend


---

## 📦 How to Run the Project

### Option 1: Using Docker Compose (Recommended)
This option uses multi-stage builds and layered JAR extraction to spin up the Spring Boot app, PostgreSQL database, and Redis cache automatically in an isolated network environment.

1. Open your terminal in the root directory of this project (where `docker-compose.yml` is located).
2. Run the following command to build and launch all services in the background:
   ```bash
   docker compose up -d --build

```

3. To verify that all containers are healthy and running:
```bash
docker compose ps

```


4. To check live application logs:
```bash
docker compose logs -f backend

```



### Option 2: Running Locally (Development Mode)

If you prefer running the Spring Boot application directly from your IDE or terminal:

1. Ensure you have a native **PostgreSQL** instance running on port `5433` (Database name: `teampulsedb`) and **Redis** running on port `6379`.
2. Run the Maven build command:
```bash
cd backend
```

```bash
./mvn clean spring-boot:run
```

---

## 📖 API Documentation (Swagger UI)

The API is fully documented using OpenAPI 3 / Swagger. Because the application utilizes a global servlet context path, the documentation endpoint is prefixed.

* **Swagger UI Interactive Interface:** 👉 [http://localhost:8080/api/v1/swagger-ui/index.html](https://www.google.com/search?q=http://localhost:8080/api/v1/swagger-ui/index.html)
* **OpenAPI Specification (JSON Docs):** 👉 `http://localhost:8080/api/v1/v3/api-docs`

### 💡 How to Test Secured Endpoints in Swagger:

1. Navigate to the authentication endpoints and execute a successful login request (`POST /auth/login`).
2. Copy the generated `accessToken` from the JSON response block.
3. Scroll to the top of the Swagger page and click the **Authorize** button (indicated by the lock icon).
4. Type `Bearer ` followed by your token (e.g., `Bearer eyJhbGciOi...`) and click **Authorize**.

---

## 🌐 Frontend Integration Guide

If you are developing or connecting a frontend client (React, Next.js, Vue, etc.) to this backend, please review the following technical constraints carefully:

### 1. Base API URL

Every HTTP network request from your frontend client must be prefixed with the versioned context path:

```text
http://localhost:8080/api/v1

```

### 2. CORS & Credentials Configuration (CRITICAL)

The backend enforces explicit credential validation (`allowCredentials = true`). Because of this, cross-origin requests **will be blocked by the browser unless your HTTP client explicitly shares credentials/cookies**.

* **Axios Configuration Example:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  withCredentials: true // ⚠️ REQUIRED: Enforces credential sharing across origins
});

```


* **Fetch API Example:**
```javascript
fetch('http://localhost:8080/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include', // ⚠️ REQUIRED: Prevents browser CORS blocks
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(credentials)
});

```



### 3. Allowed Domains

The backend safety filters accept requests **only** from the following origins:

* `http://localhost:3000` (Default React/Next.js port)
* `http://localhost:5000`
* `https://app.teampulse.com`

### 4. CSRF & Authentication

* **CSRF Protection:** **DISABLED**. Since the app communicates via stateless JWTs, you do not need to retrieve or append a CSRF token to request headers.
* **Secured Endpoints:** For any request outside of the public `/auth/` paths, you must include the access token inside the request's HTTP authorization header:
```text
Authorization: Bearer <Your_Access_Token>

```
