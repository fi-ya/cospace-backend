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