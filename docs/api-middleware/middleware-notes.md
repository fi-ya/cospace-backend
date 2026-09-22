# Middleware Notes

## Explore

### 1. Custom Request Logger
Understand how to access the request object and pass execution down the chain using next().

Read 

Read 

Using the current `logger.ts` as the concrete example:

```ts
export function logger(req: Request, _res: Response, next: NextFunction): void {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
	next();
}
```

**Accessing the request object**

Express passes the request as the first parameter, `req`. It carries everything about the incoming HTTP call:

- `req.method` — the HTTP verb (`GET`, `POST`, etc.)
- `req.originalUrl` — the full requested path, including query string
- `req.params`, `req.body`, `req.headers` — route parameters, parsed body, headers

Because `req` is passed by reference, any middleware anywhere in the chain can read (or attach properties to) the same object, and later middleware/route handlers will see those changes.

**Passing execution down the chain**

Express middleware doesn't return a response automatically — it must explicitly hand off control by calling `next()`:

```ts
next();
```

This tells Express: "I'm done with my work, move to the next registered middleware or route handler." If `next()` is never called, and the handler doesn't send a response either, the request hangs indefinitely — the client just waits.

The order middleware is registered in `index.ts` defines the chain:

```ts
app.use(express.json());   // 1. parses body
app.use(logger);           // 2. logs method/URL, then calls next()
app.get("/", ...);         // 3. handles the request
```

Each `app.use()` or route handler only runs after the previous one calls `next()` (or, for a route handler, sends a response). This is why `logger` is registered before `app.use("/bookings", bookingRouter)` — it needs to run first in the chain to log every incoming request before the actual route logic executes.

### 2. Header Authentication
Learn how to parse request headers and short-circuit the request-response cycle when security conditions fail.

### 3. Body Schema Validation
Understand how to write a reusable higher-order function that generates customised validation check-points.

### 4. Global Error Catching
Learn how Express identifies error handlers using four distinct **parametersv, preventing raw code stacks from leaking to clients.