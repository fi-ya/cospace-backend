# Middleware

## Logged Request

`logger` writes one line per request with the method, path, and an ISO timestamp:

```
[2026-09-22T16:44:51.748Z] POST /bookings
```

## 401 Unauthorized

Sending a request to a protected booking route without an `Authorization` header:

```bash
curl -sS -i -X POST http://localhost:5000/bookings \
  -H 'Content-Type: application/json' \
  -d '{"desk":"Desk-05","floor":1,"date":"2026-09-25","active":true}'
```

Response:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{"error":"Unauthorized"}
```

`auth` short-circuits the chain before it reaches `bookingController.create`, so the request never touches the controller, service, or repository.

## Removing the Fourth Parameter from the Error Handler

Dropping `next` from `errorHandler`'s signature:

```ts
// before: recognised as an error handler
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void { ... }

// after: only three parameters
export function errorHandler(err: unknown, _req: Request, res: Response): void { ... }
```

Triggering a route that throws (`GET /boom`) with the three-parameter version produced Express's own default error page instead of the custom JSON response:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: text/html; charset=utf-8

<pre>Error: test error
    at ...
</pre>
```

This happened because Express decides whether a registered function is an error handler purely by counting its parameters. With only three, Express treated `errorHandler` as ordinary middleware, so it was skipped entirely once an error occurred. With no other error handler registered, Express fell back to its built-in default handler, which returned an HTML page containing the raw stack trace instead of the clean `{ "error": "Internal Server Error" }` JSON response. Restoring the fourth parameter (`_next: NextFunction`) fixed this.

---

# SHOWCASE

## 1. Request Logging Verification; Explain how the logger interceptor reads the request details before passing control to the routing layer.

`logger` sits as an interceptor between body parsing and the route handlers:

```ts
app.use(express.json());
app.use(logger);
// ... routes registered below
```

**Reading request details**

When a request arrives, Express calls `logger(req, res, next)` with the same `req` object that will eventually reach the route handler. Inside, it reads three pieces of information directly off that object:

```ts
console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
```

- `new Date().toISOString()` — a timestamp generated at the moment the middleware executes, not when the response is sent.
- `req.method` — the HTTP verb Express parsed from the request line (`GET`, `POST`, etc.).
- `req.originalUrl` — the full path as the client requested it, including any query string, unaffected by any router mounting (`app.use("/bookings", ...)` doesn't rewrite it here).

None of this data is created by `logger` — it's already present on `req` because Express populated it while parsing the incoming HTTP message, before any middleware runs.

**Passing control onward**

`logger` never sends a response itself (`_res` is intentionally unused, marked with the underscore). Its only side effect is the `console.log`. After that, it calls:

```ts
next();
```

This hands the exact same `req`/`res` pair to whatever is registered next in the stack — in this app, that's `app.use("/bookings", bookingRouter)` or the root `app.get("/", ...)` handler, depending on the path. The routing layer then matches the method and path against its registered routes and dispatches to the correct controller.

Because `logger` runs unconditionally for every request and always calls `next()`, it behaves as a read-only interceptor: it observes the request, records it, and steps aside without altering the request or blocking it from reaching routing.

## 2. Blocked Authentication Demo: Walk through how the auth middleware checked for the header and chose to short-circuit the pipeline, saving the controller from processing an unauthenticated request.

Read , lines 1 to 14

`auth` sits directly in the route chain, before the controller:

```ts
router.post(
	"/",
	auth,
	validate(["desk", "floor"]),
	(req, res) => bookingController.create(req, res),
);
```

**Checking for the header**

When the request arrives, `auth(req, res, next)` reads the header value straight off the request object:

```ts
const token = req.headers.authorization;
```

Express lowercases header names, so this reads whatever the client sent as `Authorization`, regardless of casing. No parsing is needed for the required format here — it's compared as a plain string.

**Deciding to short-circuit**

```ts
if (token !== VALID_TOKEN) {
	res.status(401).json({ error: "Unauthorized" });
	return;
}
```

Two things happen in this branch:

1. `res.status(401).json({ error: "Unauthorized" })` writes and sends the HTTP response immediately, right there in `auth`.
2. `return` exits the function without calling `next()`.

This combination is the short-circuit: because `next()` is never invoked, Express has no reason to advance the request to whatever was registered after `auth` — in this case `validate` and the anonymous wrapper calling `bookingController.create`. The request cycle ends at `auth`.

**What this saves the controller from doing**

Because the pipeline stops here, none of the following ever execute for an unauthenticated request:

- `validate(["desk", "floor"])` — no field-presence check runs.
- `bookingController.create` — no `req.body` extraction or try/catch happens.
- `BookingService.create` — the desk-name business rule is never evaluated.
- `BookingRepository.create` — the in-memory array is never touched.

The verified request in `middleware.md` shows exactly this: a `POST /bookings` with no `Authorization` header, but a fully valid JSON body, still returned `401 Unauthorized` — proof that `auth` rejected the request purely on the missing/invalid token, before the body was ever inspected by `validate` or the controller.

**When the token matches**

Only if `token === VALID_TOKEN` does execution reach:

```ts
next();
```

which hands the request forward to the next middleware in the array — `validate`, then eventually the controller. `auth` behaves as a gatekeeper: it decides, based solely on the header, whether the rest of the chain is even allowed to run.

## 3. Request Schema Validation:Explain how our dynamic validation middleware validates inputs at the boundary before they ever reach our services or database layer.

`validate` is a middleware factory placed directly in the route chain, before the controller ever runs:

```ts
router.post(
	"/",
	auth,
	validate(["desk", "floor"]),
	(req, res) => bookingController.create(req, res),
);
```

**How it checks the boundary**

`validate(["desk", "floor"])` returns a middleware that inspects `req.body` — the raw, already-JSON-parsed client payload — before Express ever calls the controller:

```ts
const missingFields = requiredFields.filter(
	(field) => req.body?.[field] === undefined,
);
```

It doesn't know or care what `desk` or `floor` mean semantically (that's the service's job with the 3-character desk-name rule); it only confirms the client actually sent those keys at all. The `?.` guard also protects against a missing or malformed body without crashing.

**Rejecting bad input before it goes further**

```ts
if (missingFields.length > 0) {
	res.status(400).json({ error: "Missing required fields", missingFields });
	return;
}
```

If any required field is absent, the middleware sends the `400` response itself and returns immediately — it never calls `next()`. That means:

- `bookingController.create` is never invoked.
- `BookingService.create` never runs its desk-length validation.
- `BookingRepository.create` never touches the in-memory array.

The malformed request is stopped at the API boundary, before it can reach business logic or storage.

**Passing through valid input**

Only when every required field is present does the middleware call:

```ts
next();
```

handing the request to the controller, which then hands a well-formed body to the service and, ultimately, the repository. Because `validate` is generic (it takes `requiredFields: string[]`), the same boundary check can be reused for any route with different required fields, without duplicating this logic inside every controller method.

## 4. Centralised Exception Catching:Explain why this safety net prevents the Express server from crashing and keeps detailed error stack traces hidden from malicious users.

Read 

`errorHandler` acts as a safety net because it's the single place every unhandled error in the request pipeline funnels through, registered last:

```ts
app.use("/bookings", bookingRouter);

app.use(errorHandler);
```

**Preventing a crash**

Express 5 automatically catches synchronous throws and rejected promises inside route handlers and forwards them to the nearest four-parameter middleware, rather than letting them propagate up and crash the Node.js process. If no error handler existed at all, an uncaught exception could terminate the entire server — every in-flight request would fail, and the process would need to be restarted (this is exactly the scenario `SIGTERM`/`SIGINT` handling protects against on shutdown, but here it's about an unexpected runtime error, not a deliberate stop signal).

Because `errorHandler` is always reached, it guarantees the process keeps running and every failing request still receives a real HTTP response:

```ts
res.status(500).json({ error: "Internal Server Error" });
```

One bad request (a bug, a bad database call, an unexpected null) degrades to a single `500` response instead of taking down the whole application for every other user currently connected.

**Hiding stack traces from clients**

The critical design choice is what goes where:

```ts
console.error(err instanceof Error ? err.stack : err);   // server-side only
res.status(500).json({ error: "Internal Server Error" }); // client-facing only
```

The full stack trace — file paths, line numbers, function names, sometimes even fragments of source code or internal library details — is sent to `console.error`, which stays on the server (logs, terminal, log aggregator). The client only ever receives the fixed, generic string `"Internal Server Error"`.

This matters because a raw stack trace is a reconnaissance tool for a malicious user: file paths reveal the server's directory structure and framework internals, line numbers can help fingerprint the exact library version in use, and error messages sometimes leak details like table or column names from a database driver. Without a centralized handler like this one, Express's own default error page (as seen earlier when the fourth parameter was removed) does exactly that — it returns the stack trace as HTML directly to the caller. This custom `errorHandler` closes that gap by making sure only the operator (via `console.error`) ever sees the sensitive detail, while every external caller sees an opaque, safe message.