# Error Handling: Designing Resilient and Predictable APIs

In this session, we will implement a centralised, production-grade error handling architecture. We will design standard JSON error structures and map system failures to precise HTTP status codes

## The Exploration (AI-Supported Task) - 50min

### 1. Custom AppError Base Class: Learn how to extend native system classes to capture custom structural parameters.

Using `AppError` in `appError.ts` as the concrete example:

```ts
export class AppError extends Error {
	public readonly statusCode: number;
	public readonly status: "fail" | "error";
	public readonly isOperational: boolean;

	constructor(message: string, statusCode: number) {
		super(message);
		...
	}
}
```

**What `extends Error` actually gives you**

`Error` is a built-in JavaScript class with exactly two meaningful properties: `message` and `name`, plus a non-standard-but-universal `stack` property that engines populate automatically. By writing `class AppError extends Error`, `AppError` inherits all of that behavior — `instanceof Error` checks still work, `try/catch` still recognizes it, and the built-in `.toString()` and `.stack` formatting still function — without having to reimplement any of it.

**Why `super(message)` must come first**

```ts
constructor(message: string, statusCode: number) {
	super(message);
	...
}
```

`super(message)` calls `Error`'s own constructor, which is what actually assigns `this.message = message` internally. This must run *before* any custom property assignment (`this.statusCode = ...`), because in a subclass, `this` doesn't exist as a valid object until `super()` has returned — attempting `this.statusCode = statusCode` before `super(message)` would throw a `ReferenceError`.

**Adding custom structural parameters on top of the native ones**

Once `super()` has run, the rest of the constructor adds fields that `Error` itself has no concept of:

```ts
this.statusCode = statusCode;
this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
this.isOperational = true;
```

These are ordinary instance properties — nothing special happens here that doesn't happen in any other class. The significance is that they now travel *alongside* the inherited `message`/`stack`, so a single thrown object carries both the native error information and the application-specific metadata (`statusCode`, `status`, `isOperational`) needed to decide how to respond to it.

**Why stack-trace capture needs special handling**

```ts
Error.captureStackTrace(this, this.constructor);
```

Normally, when you `throw new Error(...)`, the stack trace begins at the point of the `throw` — this is Node's built-in behavior, and `super(message)` already triggers it. But because `AppError`'s constructor does extra work (assigning three more properties) after `super()` runs, without this line the captured stack could theoretically include noise from inside `AppError`'s own constructor rather than starting cleanly at whatever code called `new AppError(...)`. `captureStackTrace(this, this.constructor)` tells V8 to omit frames from `this.constructor` (i.e. `AppError` itself) onward, so the recorded trace begins exactly where the application code created the error — useful for debugging, since a developer wants to see *their* code path, not the internals of the error class.

**Why this matters for downstream code (e.g. a global error handler)**

Because `AppError` is still an `Error` under the hood, existing code that only knows how to handle generic errors keeps working unchanged. But code that specifically checks:

```ts
if (err instanceof AppError) {
	res.status(err.statusCode).json({ status: err.status, message: err.message });
}
```

can now branch on the custom structural data this subclass adds, distinguishing "an error the application deliberately threw with a known HTTP status" from "an unexpected exception that should fall back to a generic `500`" — a distinction the native `Error` class alone has no way to express.

### 2. Standardised Subclasses: Understand how to use inheritance to build focused, semantic exception classes.

Using `BadRequestError` in `badRequestError.ts` alongside its parent `AppError` as the concrete example:

```ts
// src/utils/appError.ts
export class AppError extends Error {
	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}
}

// src/errors/badRequestError.ts
export class BadRequestError extends AppError {
	constructor(message = "Bad Request") {
		super(message, 400);
	}
}
```

**Two levels of inheritance, two levels of purpose**

There are actually two `extends` relationships stacked here:

```
Error -> AppError -> BadRequestError
```

`Error -> AppError` is generic infrastructure: it teaches any application error how to carry a `statusCode`, a `status` string, and a captured stack trace — concerns shared by *every* operational error, regardless of what specifically went wrong.

`AppError -> BadRequestError` is where semantic meaning enters. `BadRequestError` doesn't add any new *capability* — it doesn't introduce a new property or override any method — it only fixes one of `AppError`'s two constructor parameters to a constant:

```ts
super(message, 400);
```

**Why "fixing a parameter" counts as meaningful inheritance**

Without `BadRequestError`, every place in the codebase that wants to reject malformed input would write:

```ts
throw new AppError("Desk name too short", 400);
```

repeating the literal `400` everywhere, with no compiler-enforced link between "this is a client input problem" and "the status code must be 400." By contrast:

```ts
throw new BadRequestError("Desk name too short");
```

The status code is no longer a piece of data the caller has to remember correctly — it's baked into the *type itself*. `BadRequestError` always means `400`. There's no way to accidentally throw a `BadRequestError` with statusCode `500`, because the subclass's constructor doesn't expose `statusCode` as a parameter at all.

**Focused classes as self-documenting call sites**

Compare:

```ts
throw new AppError("Booking not found", 404);
```

with:

```ts
throw new NotFoundError("Booking not found");
```

The second reads as intent, not implementation detail — a developer scanning the code immediately understands *what kind* of failure this is without needing to know or check the numeric status code. This is the core value of building a small hierarchy of subclasses rather than one flat `AppError` class used everywhere with different numbers passed in: each subclass name (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`) documents the semantic category of failure at the point where it's thrown.

**How this pays off in a catch block**

Because every subclass is still `instanceof AppError` (and therefore `instanceof Error`), a single error handler can catch all of them uniformly:

```ts
if (err instanceof AppError) {
	res.status(err.statusCode).json({ status: err.status, message: err.message });
}
```

The handler never needs to know about `BadRequestError` or `NotFoundError` specifically — it only relies on the shared `AppError` contract (`statusCode`, `status`, `message`). The subclasses exist purely to make the *throwing* code expressive and correct by construction, while the *handling* code stays generic and doesn't grow a new branch every time a new semantic error type is added.

### 3. Centralised Handler Update: Master the logic needed to separate trusted system exceptions from unexpected code failures.

Read , lines 1 to 30

Read , lines 1 to 30

Noted — you've kept the `/boom-app-error` test route in `index.ts`; I won't remove it again since that was a deliberate undo on your part.

Using `errorHandler.ts` and `AppError.isOperational` as the concrete example:

```ts
// appError.ts
this.isOperational = true;

// errorHandler.ts
if (err instanceof AppError) {
	res.status(err.statusCode).json({ status: err.status, message: err.message, errors: [] });
	return;
}

console.error(err instanceof Error ? err.stack : err);
res.status(500).json({ error: "Internal Server Error" });
```

**Two fundamentally different categories of failure**

Every error a Node process can throw falls into one of two buckets:

- **Trusted/operational errors** — failures the application anticipated and deliberately raised because a specific, known condition occurred: a booking wasn't found, an authorization header was missing, a desk name was too short. The code *knows exactly what went wrong* and *knows the correct HTTP response* for it.
- **Unexpected/programmer errors** — failures nobody wrote code to anticipate: a typo causing `undefined.someProperty`, a third-party library throwing something unfamiliar, a bug in the code itself. Nobody decided in advance what these mean or what status code they deserve.

**How `instanceof AppError` performs the separation**

```ts
if (err instanceof AppError) { ... }
```

This single check is the entire separation logic. `AppError` (and its subclasses `BadRequestError`, `NotFoundError`, etc.) is *only* ever constructed deliberately, at a specific point in application code, by a developer who explicitly decided "this situation means a 404" or "this situation means a 400." Because of that, if an error passes this check, it's provably a trusted, anticipated failure — there's no other code path that could produce an `AppError` instance by accident.

Anything that *doesn't* pass this check — a raw `TypeError`, a database driver error, a bug — falls through to the second branch, which is the "I don't know what this is" path.

**Why the two branches respond so differently**

```ts
// trusted: safe to expose to the client
res.status(err.statusCode).json({ status: err.status, message: err.message, errors: [] });

// unexpected: log internally, hide details from the client
console.error(err instanceof Error ? err.stack : err);
res.status(500).json({ error: "Internal Server Error" });
```

For a trusted `AppError`, `err.message` was written by the application itself specifically to be shown to an API consumer (`"Desk name must be at least 3 characters long"`) — it's safe to send verbatim. For an unexpected error, the message might contain a stack trace, a file path, or a fragment of a SQL query — none of which should ever reach a client, which is why it's routed to `console.error` (server-side only) and replaced with the generic `"Internal Server Error"` string in the response.

**Why `isOperational` exists even though this handler doesn't check it yet**

The property is set on every `AppError` (`this.isOperational = true`), but the current `instanceof AppError` check already achieves the separation without needing to read it. `isOperational` becomes useful in a more advanced setup — for example, a process-level `uncaughtException` handler that decides whether to let the server keep running (`isOperational === true`, a known/recoverable condition) or terminate the process entirely (`isOperational` absent/false, meaning the application's internal state might be corrupted in an unpredictable way). It's a marker for "was this failure something the application anticipated," independent of whichever specific handler happens to be reading it.

---

## The Mastery (Manual Feedback & Correction Loop) - 50min

## 1. Broken Prototype Chains
## 2. Missing Catch Triggers
## 3. Leaking Raw System Secrets
## 4. Raw Numeric Magic Numbers
## 5. Swallowing Express Errors

---

## Showcase & Technical Demo - 20min

## 1. 404 Resource Demonstration -> Explain how the service layer detected a missing resource, threw a NotFoundError, and passed it down to the global error middleware.
## 2. 400 Validation Validation -> Walk through how Zod exceptions are intercepted in the global handler, maintaining the exact same JSON shape as other application errors.
## 3. 401 and 403 Security Checks -> Discuss why clear differences between 401 (who are you?) and 403 (you cannot do this) are essential for frontend access control.
## 4. Safe 500 System Isolation -> Explain why masking non-operational errors is a critical security rule that prevents hackers from gathering details about your server environments.
