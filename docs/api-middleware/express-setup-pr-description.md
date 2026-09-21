# PR: feat/add-express-typescript-basic-server

## Summary

Add the initial Express and TypeScript backend server for CoSpace. The server exposes a health-check endpoint on port 5000, supports a watched development workflow, and shuts down gracefully when it receives termination signals.

## What Was Done

- Added Express, TypeScript, Node.js typings, and `ts-node-dev` dependencies.
- Added a strict TypeScript configuration with `src` as the source directory and `dist` as the build output directory.
- Added `src/index.ts` with:
  - An Express application instance.
  - Explicit `Request` and `Response` handler types.
  - A `GET /` health-check route returning HTTP 200 and structured JSON.
  - A server listening on port 5000.
  - Graceful `SIGTERM` and `SIGINT` shutdown handlers using `server.close()`.
- Added the `npm run dev` script for watched TypeScript development with `ts-node-dev`.
- Pinned TypeScript to `5.9.3` for compatibility with the current `ts-node-dev` toolchain.
- Added `.gitignore` rules and reorganised database documentation under `docs/database/`.
- Added setup and implementation notes under `docs/api-middleware/`.

## How to Test

Install dependencies:

```bash
npm install
```

Run the TypeScript type check:

```bash
npx tsc --noEmit
```

Start the development server:

```bash
npm run dev
```

In a second terminal, test the root endpoint:

```bash
curl -i http://localhost:5000/
```

Expected result:

```http
HTTP/1.1 200 OK
```

```json
{
  "status": "active",
  "message": "CoSpace API is running"
}
```

Press `Ctrl+C` to verify that the server handles `SIGINT` and closes cleanly.

Formatting validation:

```bash
git diff --check
```
