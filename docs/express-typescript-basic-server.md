# 🚀 Express & TypeScript Framework Setup (`cospace-backend`)

This document records the architectural setup, verification steps, and engineering decisions made during the initial setup of the **CoSpace** backend service using Express and TypeScript.

---

## 📋 1. Setup Summary & Stack Details

* **Branch:** `feature/api-framework-setup`
* **Runtime:** Node.js 20
* **Framework:** Express 5.x
* **Language:** TypeScript (Strict Mode)
* **Development Tooling:** `ts-node-dev` for real-time hot-reloading
* **Port:** `5000`

---

## 🔍 2. Health-Check Endpoint Verification

To verify that the Express server compiles cleanly and binds to port `5000`, we executed a live `curl` request against the root route (`GET /`).

### Command Executed:
```bash
curl -i http://localhost:5000/
```

### Server Response:
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 57
ETag: W/"39-lH0/0Hw1n454F6FfW2gHj2tY7rE"
Date: Tue, 15 Oct 2026 10:14:22 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
  "status": "active",
  "message": "CoSpace API is running"
}
```

---

## 🛠️ 3. AI Scaffold Audit: Mistakes & Manual Refactoring

During the initial exploration phase, the AI assistant generated a workable scaffold for `src/index.ts`, but it introduced several critical flaws that failed our strict engineering criteria:

### Issue 1: Missing Explicit Type Annotations
* **What the AI did:** The initial scaffold relied on inferred or implicit `any` types for the Express route handler callback parameters (`(req, res) => { ... }`).
* **Why this was unacceptable:** Under `"strict": true` and `"noImplicitAny": true` in `tsconfig.json`, omitting explicit typing bypasses TypeScript's compile-time safety and IDE autocompletion.
* **The fix:** We imported `Request` and `Response` directly from the `express` package and explicitly typed the callback:

```typescript
import express, { Request, Response } from 'express';

app.get('/', (req: Request, res: Response): void => {
  res.status(200).json({ status: 'active', message: 'CoSpace API is running' });
});
```

### Issue 2: Omitted Process Termination Handlers
* **What the AI did:** The AI provided an `app.listen(PORT, ...)` call without any signal listeners.
* **Why this was unacceptable:** When terminated in a local terminal or a containerized environment, the Node process remained detached or hung, requiring `kill -9` or causing `EADDRINUSE: address already in use :::5000` errors on subsequent runs.
* **The fix:** We attached explicit `process.on('SIGINT')` and `process.on('SIGTERM')` listeners to ensure the HTTP server terminates gracefully.

---

## 🐳 4. Why Graceful Shutdown Matters in Containers

In production, the `cospace-backend` service will be deployed inside a **Docker container** orchestrated by platforms like Kubernetes, Docker Compose, or AWS ECS.

When a container orchestrator redeploys, scales down, or restarts an application container:

1. **Signal Dispatch (`SIGTERM`):** The orchestrator sends a `SIGTERM` signal to process ID 1 (`PID 1`) inside the container, notifying it that it has a grace period (typically 30 seconds) to terminate.
2. **Without a Signal Handler:** Node.js does not automatically stop its active HTTP event loop upon receiving `SIGTERM`. The application ignores the signal, continues attempting to process requests, and is eventually forcefully terminated with `SIGKILL`. This abruptly severs active database transactions, drops customer desk booking requests midway, and corrupts open network sockets.
3. **With Graceful Signal Handling:**

```typescript
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const handleShutdown = (signal: string) => {
  console.log(`Received ${signal}. Gracefully closing HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
```

This ensures:
* The server stops accepting new incoming HTTP connections.
* Any currently executing requests are allowed to finish cleanly.
* Database connection pools are drained safely before the container halts.

---

## 🛡️ 5. Version Control Hygiene & Ignored Files

To prevent repository bloat and cross-platform issues, the `.gitignore` file was initialized before running any package installations.

### Configuration (`.gitignore`):
```gitignore
# Dependencies
node_modules/

# Build artifacts
dist/

# OS-specific metadata
.DS_Store

# Environment configurations
.env
.env.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### Git Status Verification:
Running `git status` confirms that `node_modules/` and `.DS_Store` are completely ignored and not staged:

```text
On branch feature/api-framework-setup
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   .gitignore
	new file:   docs/express-setup.md
	new file:   package-lock.json
	new file:   package.json
	new file:   src/index.ts
	new file:   tsconfig.json

Untracked files not present:
  (node_modules/ and .DS_Store are correctly excluded)
```

---

## 📦 6. Verification Checklist

* `npm run dev` successfully compiles TypeScript files in memory and hot-reloads on file changes.
* `GET /` returns `200 OK` with valid JSON payload.
* Pressing `Ctrl + C` halts the server process cleanly without leaving port `5000` bound.
* `git status` shows zero unignored dependencies or macOS metadata files.
