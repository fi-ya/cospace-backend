# Middleware Notes

## Explore

### 1. Custom Request Logger
#### Understand how to access the request object and pass execution down the chain using next().

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

#### APPLY /BOOKINGS - not globally 
**Reasoning:** The root route (GET /) is a public health-check ({"status":"active",...}) — it's meant to confirm the API is running without requiring credentials. Locking it down globally would break that purpose.
Booking data is the actual protected resource — reading, creating, updating, and deleting bookings is where access control matters.
Scoping auth to /bookings also means it runs after JSON parsing/logging but only for the routes that need it, keeping the root route lightweight.
Mount it right before the booking router:

#### Learn how to parse request headers and short-circuit the request-response cycle when security conditions fail.
Using the current `auth.ts` as the concrete example:

```ts
export function auth(req: Request, res: Response, next: NextFunction): void {
	const token = req.headers.authorization;

	if (token !== VALID_TOKEN) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	next();
}
```

**Parsing request headers**

Express exposes all incoming headers as a plain object on `req.headers`. Header names are lowercased regardless of how the client sent them:

```ts
req.headers.authorization
```

This reads the `Authorization` header value directly — no manual string splitting needed for this simple case (a real bearer-token scheme would typically require splitting off the `Bearer ` prefix, but this middleware compares the raw header value against `VALID_TOKEN`).

**Short-circuiting the cycle**

The critical pattern is:

```ts
if (token !== VALID_TOKEN) {
	res.status(401).json({ error: "Unauthorized" });
	return;
}
```

- `res.status(401).json(...)` sends the response immediately — the client gets an answer right here, without ever reaching the booking routes.
- `return` stops the function from executing further. This is essential: if you called `res.json(...)` but forgot `return`, execution would fall through to `next()` below, and Express would throw `ERR_HTTP_HEADERS_SENT` because you can't send a second response for the same request.
- Because `next()` is never called on the failure path, the request never reaches `bookingRouter`. The cycle ends here — it "short-circuits."

Only when the token matches does the function reach:

```ts
next();
```

which hands the request forward to `bookingRouter`. This is why `auth` is mounted before the router:

```ts
app.use("/bookings", auth, bookingRouter);
```

Express evaluates middleware left to right, so `auth` gets first refusal on every `/bookings` request before any booking logic runs.

### 3. Body Schema Validation
#### Understand how to write a reusable higher-order function that generates customised validation check-points.
Using `validate.ts` as the concrete example:

```ts
export function validate(requiredFields: string[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const missingFields = requiredFields.filter(
			(field) => req.body?.[field] === undefined,
		);

		if (missingFields.length > 0) {
			res.status(400).json({ error: "Missing required fields", missingFields });
			return;
		}

		next();
	};
}
```

**What makes it a higher-order function**

`validate` doesn't behave like `logger` or `auth`, which are middleware directly. Instead, `validate` is a *factory* — a function that takes configuration (`requiredFields`) and **returns** a new middleware function tailored to that configuration:

```ts
validate(string[]) -> (req, res, next) => void
```

It's "higher-order" because it returns a function rather than being the middleware itself.

**Why this matters for reuse**

Without this pattern, you'd need a separate hardcoded middleware for every combination of required fields — one for bookings, one for users, one for rooms. Instead, one generic function can generate any number of specialized checkpoints:

```ts
router.post("/", validate(["desk", "floor", "date"]), bookingController.create);
router.post("/users", validate(["email", "firstName"]), userController.create);
```

Each call to `validate(...)` closes over its own `requiredFields` array via a closure — the returned function "remembers" the array it was created with, even though it runs later, inside Express's request cycle, with no direct access to the original call site.

**The general shape**

```ts
function middlewareFactory(config) {
	return (req, res, next) => {
		// use `config` here
	};
}
```

This is the same higher-order pattern used by Express's own `express.static(dir)`, `cors(options)`, and similar configurable middleware — you're not writing the request handler yet, you're writing a function that produces one, customized by whatever arguments you pass in.


### 4. Global Error Catching
#### Learn how Express identifies error handlers using four distinct **parametersv, preventing raw code stacks from leaking to clients.

Using the current `errorHandler.ts` as the concrete example:

```ts
export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	console.error(err instanceof Error ? err.stack : err);
	res.status(500).json({ error: "Internal Server Error" });
}
```

**How Express identifies an error handler**

Express inspects the *arity* (parameter count) of every middleware function it's given. A normal middleware or route handler has three parameters:

```ts
(req, res, next) => { ... }
```

An error handler must have exactly **four**:

```ts
(err, req, res, next) => { ... }
```

This isn't a TypeScript type distinction — it's how Express's JavaScript runtime literally checks `fn.length` when deciding whether a registered function is a regular middleware or an error-handling middleware. If you write only three parameters, Express treats it as normal middleware and it will never receive errors.

**Why `_req` and `_next` still need to be there**

Even though this handler doesn't use `req` or `next`, they must remain in the signature (prefixed with `_` to signal "intentionally unused") — removing either would drop the function back to three parameters and Express would stop recognizing it as an error handler.

**How errors reach it**

Express only invokes error handlers when something calls `next(err)` with an argument, or when a synchronous exception is thrown inside a regular route/middleware. Because of this, `errorHandler` must be registered *after* all routes:

```ts
app.use("/bookings", auth, bookingRouter);

app.use(errorHandler);
```

If a booking route throws, Express skips every remaining normal middleware and jumps straight to the first four-parameter handler it finds — this one.

**Preventing stack leaks**

```ts
console.error(err instanceof Error ? err.stack : err);
res.status(500).json({ error: "Internal Server Error" });
```

The stack trace is logged server-side only, via `console.error`. The client response is a generic, fixed message — no file paths, line numbers, or exception internals ever reach the caller. This separation (verbose logs for developers, opaque message for clients) is the whole point of centralizing error handling in one place instead of leaking `err.message` or `err.stack` directly into `res.json()`.

----

# Manual Feedback & Correction Loop

## Infinite Request Hangs: AI often writes conditional blocks where next() is only called in one branch, causing the client request to freeze indefinitely if it falls into the other branch.

Both files pass the check — every execution path terminates correctly. No changes needed in either file.

## Broken Error Signature: AI often drops the fourth parameter from the error handler (e.g., writing (err, req, res)), which makes Express treat it as standard middleware instead of an error handler.

Already correct — the signature has exactly four parameters: err, _req, res, _next, matching Express's error-handler arity requirement

## Bypassing TypeScript Types: AI commonly declares middleware parameters as any, disabling all editor warnings and type protections.

All four middleware files already satisfy this, have zero any usage.


## TypeScript Namespace Errors: If you want your authentication middleware to attach verified user data (like { role: 'admin' }) to req.user, TypeScript will throw a compilation error because user does not exist on Express's standard Request interface.

- The import "express" (side-effect import) is required for TypeScript to treat this file as a module that can safely use declare global.
- declare global { namespace Express { interface Request ... } } merges into Express's own Request interface rather than replacing it — all existing properties (params, body, headers, etc.) remain intact.
- user is optional (?) since not every request will have it set (e.g. before auth middleware runs).

Picked up automatically since tsconfig.json's include: ["src/**/*.ts"] covers express.d.ts. TypeScript validation passed — req.user is now a valid, typed property anywhere Request is used (e.g. in auth.ts if you assign req.user = { role: "admin" } after verifying a token

## Global vs Route-Level Registration: AI often suggests registering everything globally, meaning public health routes or GET routes end up requiring authorization.
