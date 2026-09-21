## Understand how to import module dependencies and set up an active event listener loop on a port.

In `index.ts`:

```ts
import express from "express";
```

This imports the Express dependency so TypeScript can use it.

```ts
const app = express();
```

This creates an Express application instance. The app manages routes, middleware, and HTTP requests.

```ts
const port = 5000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```

`app.listen()` starts an HTTP server on port `5000`. Node.js then keeps the process active through its event loop, waiting for incoming requests. The callback runs once the server successfully starts.

```ts
export default app;
```

This exports the app instance so other files, such as tests, can import and use it.

## Learn how to define a basic HTTP request handler and construct a structured JSON response.

I’ll use the current root route as the concrete example and explain how its handler receives the request, writes the response, and constructs structured JSON without changing the code.

Read 

An Express HTTP request handler is a function that runs when a request matches a route:

```ts
app.get("/", (_request, response) => {
  response.status(200).json({
    status: "active",
    message: "CoSpace API is running",
  });
});
```

- `app.get("/", ...)` handles `GET` requests to `/`.
- `_request` represents the incoming HTTP request. The underscore indicates it is intentionally unused.
- `response` represents the outgoing HTTP response.
- `response.status(200)` sets the HTTP status code.
- `.json({...})` sends a structured JSON object to the client.
- The object contains named properties: `status` and `message`.

A request to `http://localhost:5000/` receives:

```json
{
  "status": "active",
  "message": "CoSpace API is running"
}
```


## FIX: I pinned TypeScript to `5.9.3` because `ts-node-dev` failed with TypeScript `7.0.2`.

The new script exposed a compatibility issue: `ts-node-dev` is failing before startup because the installed TypeScript `7.0.2` is newer than the `ts-node` version bundled by `ts-node-dev`. I’m fixing the toolchain by pinning TypeScript to the compatible 5.x line and removing an existing trailing-space error, then I’ll rerun the server check.

Ran terminal command:  npm run dev

Ran terminal command:  curl -i http://localhost:5000/

The script now starts successfully and `curl` returned `HTTP 200` with the expected JSON. 

## Understand how development tools monitor file trees and hot-reload code in real-time.

`ts-node-dev` watches the project’s TypeScript files for changes while the development server is running.

```json
"dev": "ts-node-dev --respawn --transpile-only --project tsconfig.json src/index.ts"
```

How it works:

- `ts-node-dev` runs `index.ts` directly without manually building first.
- It monitors imported files in the project.
- When a `.ts` file changes, it transpiles the updated code.
- `--respawn` restarts the Node.js process with the new code.
- `--transpile-only` skips type checking during reloads, making restarts faster.
- `--project tsconfig.json` tells it which TypeScript configuration to use.

Start it with:

```bash
npm run dev
```

Then edit a source file and save it. You should see `ts-node-dev` detect the change and restart the server automatically.

Use this separately for full type checking:

```bash
npx tsc --noEmit
```

This development workflow is often called **hot reload**, although `ts-node-dev` restarts the server process rather than preserving application state in memory.


--- 

## Improve server

### 1. AI often uses implicit or explicitany types for the request and response objects, breakingTypeScript safety.Open src/index.ts. Make sure you are explicitly importing Request and Responsefrom express and annotating your callback parameters (e.g., req: Request, res: Response).

The route currently relies on Express inference and names the unused request `_request`. I’ll make both callback parameters explicit while preserving the existing behavior and export.

```ts
import express, { Request, Response } from "express";

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "active",
    message: "CoSpace API is running",
  });
});
```

Validation passed with `npx tsc --noEmit`.

### 2. AI-generated servers often do not listen to shutdown signals, meaning the nodeprocess remains stuck running in the background when you close VS Code.Add a manual listener at the bottom of src/index.ts to handle termination signals. If the process receives SIGTERM or SIGINT, run process.exit(0) to gracefully close the connection.

I’m adding two explicit process.on handlers at the bottom, one for each termination signal, without changing the existing API behavior.

I’m adding two explicit process.on handlers at the bottom, one for each termination signal, without changing the existing API behavior.

Stores the HTTP server returned by app.listen()
Handles both SIGTERM and SIGINT
Calls server.close() gracefully
Exits with status 0 after the server closes

**Note:** the following solution (server exits with status 0) would cause immediate exit that can interrupt active requests.

```ts
process.on("SIGTERM", () => {
  process.exit(0);
});

process.on("SIGINT", () => {
  process.exit(0);
});
```

# SHOWCASE QUESTIONS

## Explain how ts-node-dev handles transpilation behind the scenes, letting you run TypeScript without manual build steps during development.

`ts-node-dev` combines two tools:

- `ts-node` executes TypeScript by transpiling it in memory.
- A file watcher monitors your source files and restarts the process when they change.

With this script:

```json
"dev": "ts-node-dev --respawn --transpile-only --project tsconfig.json src/index.ts"
```

The flow is:

1. `ts-node-dev` starts `index.ts`.
2. `ts-node` reads `tsconfig.json`.
3. TypeScript converts the `.ts` code into JavaScript in memory.
4. Node.js executes that JavaScript without creating files in `dist`.
5. The watcher monitors imported files.
6. When a source file changes, the current process is stopped and restarted.
7. The changed TypeScript is transpiled again in memory.

`--transpile-only` skips type checking during startup and reloads, which makes development faster. It does not mean TypeScript types are ignored completely; run this separately:

```bash
npx tsc --noEmit
```

The production-style workflow is different:

```bash
npx tsc
node dist/index.js
```

That creates compiled JavaScript in `dist`. `ts-node-dev` is mainly a development convenience that avoids this manual build step.

## Describe the request-response lifecycle, showing how the client request hit port 5000 and triggered your route controller.

The request-response lifecycle works like this:

1. A client sends an HTTP request:

```bash
curl http://localhost:5000/
```

2. The request reaches the Node.js process listening on port `5000`.

3. Express receives the request and checks the HTTP method and path:

```ts
app.get("/", (req: Request, res: Response) => {
  // ...
});
```

4. The `GET` method and `/` path match the route. Express invokes the callback, which acts as the route controller.

5. The handler uses the `Response` object to send a status code and JSON body:

```ts
res.status(200).json({
  status: "active",
  message: "CoSpace API is running",
});
```

6. The client receives the response:

```json
{
  "status": "active",
  "message": "CoSpace API is running"
}
```

In short:

```text
Client
  -> GET /
  -> localhost:5000
  -> Express app
  -> matching GET / route
  -> request handler/controller
  -> HTTP 200 JSON response
  -> Client
```

## Explain the importance of catching system signals and how it ensures resources are released properly on cloud deployment platforms.

Cloud platforms send system signals when they stop, restart, or replace an application instance.

Common signals include:

- `SIGTERM`: the platform asks the process to shut down gracefully.
- `SIGINT`: commonly sent when stopping the process manually, such as with `Ctrl+C`.

Handling these signals lets the application:

1. Stop accepting new connections.
2. Finish requests that are already in progress.
3. Close the HTTP server.
4. Release database connections, file handles, sockets, and other resources.
5. Exit with a successful status.

Example:

```ts
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received: closing HTTP server`);

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

This matters on platforms such as containers, Kubernetes, and managed cloud services because instances are regularly replaced during deployments, scaling, health checks, or infrastructure maintenance.

Without graceful shutdown, the process may terminate while handling a request or holding resources. That can cause incomplete responses, interrupted database work, connection leaks, and failed deployments. Signal handling gives the application a short window to finish clean-up before the platform forcibly terminates it.