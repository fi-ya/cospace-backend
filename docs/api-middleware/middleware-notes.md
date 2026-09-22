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