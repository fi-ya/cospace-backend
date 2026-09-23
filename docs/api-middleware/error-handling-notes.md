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

### 3. Centralised Handler Update: Master the logic needed to separate trusted system exceptions from unexpected code failures.

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
