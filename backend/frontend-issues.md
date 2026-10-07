# Issue #39: Unhandled Socket Connection Errors Logging to Console

## Problem Overview
When the `chat-service` is down or unreached, the frontend socket client logs connection failure errors directly to the browser console on every page navigation and retry attempt.

---

## Behavior Observed
1. The WebSocket connection attempts to reach the socket server on every page (Dashboard, Task Board, Teams, Settings).
2. If the connection fails or drops, `SocketClient.js` repeatedly triggers `console.error` calls:
   ```text
   SocketClient.js:151 [SocketClient] Connection error: websocket error
   WebSocket connection to 'ws://localhost:5005/socket.io/?EIO=4&transport=websocket' failed


3. Because the connection retries periodically, these errors accumulate continuously in the browser console.

---


* The subject's general evaluation guidelines strictly state that **the project will be rejected if unhandled errors or warnings appear in the browser console** during normal usage or service degradation testing.
* When an evaluator manually stops or restarts the `chat-service` container to test resilience, these continuous console errors become immediately visible across all application pages.

---

* Check why `SocketClient.js` emits raw `console.error` calls unconditionally on lifecycle failure events (`connect_error`, `error`).
* Check if the socket connection endpoint is attempting direct fallback connections (`ws://localhost:5005`) when behind the HTTPS reverse proxy (`https://localhost`).
* Review how connection failure states should be handled silently or restricted to developer/debug modes without populating the production browser log.
