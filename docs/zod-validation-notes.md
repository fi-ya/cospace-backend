# Zod Validaiton 

# EXPLORE
## 1. Writing the Booking Schema: Learn how to translate declarative business rules into Zod schema chains and validations.

Using `booking.schema.ts` as the concrete example:

```ts
export const createBookingSchema = z.object({
	desk: z.string().trim().min(3).max(100),
	floor: z.string().trim().min(5).max(200),
	date: z.string().date(),
	active: z.boolean().default(true),
});
```

**Business rule → Zod chain**

Each field starts with a base type validator, then chains additional constraints in order:

- Rule: *"desk name, trimmed, 3–100 characters"* becomes:
  ```ts
  z.string().trim().min(3).max(100)
  ```
  `z.string()` asserts the type is a string at all. `.trim()` is a **transform** — it doesn't just validate, it actually strips leading/trailing whitespace from the value before the next check runs. `.min(3)` and `.max(100)` then validate the *trimmed* result's length, so `"  AB  "` (5 chars including spaces) correctly fails the 3-character minimum after trimming leaves `"AB"` (2 chars).

- Rule: *"a valid ISO date string"* becomes:
  ```ts
  z.string().date()
  ```
  `.date()` is a format validator built into Zod — it checks the string matches the ISO `YYYY-MM-DD` pattern, rejecting things like `"09/24/2026"` or `"not-a-date"`.

- Rule: *"optional boolean, defaults to true"* becomes:
  ```ts
  z.boolean().default(true)
  ```
  `.default(true)` means the input doesn't have to include `active` at all — if it's `undefined`, Zod substitutes `true` before the value is returned, without throwing a validation error.

**How chains compose**

Each method in the chain returns a new schema object, so `.trim().min(3).max(100)` isn't three separate checks bolted on — it's a single pipeline: transform first, then validate the transformed result, in the exact order written. This is why `.trim()` must come *before* `.min()`/`.max()` here — reversing the order would validate length against the untrimmed string.

**Parsing turns rules into a runtime decision**

None of this actually rejects anything until you call `.parse()` or `.safeParse()` on incoming data:

```ts
createBookingSchema.parse(req.body);
```

If every chain in the object succeeds, you get back a typed, cleaned value (trimmed strings, `active` defaulted). If any chain fails, Zod throws (or returns an error result with `safeParse`) describing exactly which field and rule failed — which is what the next step (a middleware wrapper) will translate into an HTTP `400` response.

## 2. Building Zod Middleware: Understand how to construct a reusable middleware wrapper that bridges Zod schemas with Express request lifecycles.

Using `validateSchema` in `validate.ts` as the concrete example:

```ts
export function validateSchema(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			res.status(400).json({ error: "Validation failed", details: result.error.issues });
			return;
		}

		req.body = result.data;
		next();
	};
}
```

**Why a wrapper is needed at all**

A Zod schema (like `createBookingSchema`) knows nothing about Express, HTTP, or request/response objects. It only exposes generic parsing methods:

```ts
schema.safeParse(anyValue) -> { success: true, data } | { success: false, error }
```

Express middleware, by contrast, must match the shape `(req, res, next) => void`. The wrapper's job is to sit between these two worlds — translating a schema's generic parse result into an Express-specific action.

**The factory pattern**

`validateSchema` is itself a higher-order function, following the same shape as the earlier `validate(requiredFields)` factory:

```ts
validateSchema(schema: ZodSchema) -> (req, res, next) => void
```

Calling `validateSchema(createBookingSchema)` doesn't run any validation immediately — it returns a *new* middleware function that closes over `schema`. That returned function only executes later, when Express dispatches an actual request to the route it's attached to:

```ts
router.post("/", validateSchema(createBookingSchema), (req, res) => { ... });
```

This is what makes it reusable: the same `validateSchema` function can wrap any schema — `createBookingSchema`, a future `updateUserSchema`, etc. — without rewriting the bridging logic each time.

**Bridging the parse result to the request lifecycle**

Inside the returned middleware:

```ts
const result = schema.safeParse(req.body);
```

`safeParse` is deliberately used over `parse` — it never throws, it returns a discriminated union (`success: true/false`), so the middleware can branch cleanly rather than needing a `try/catch`.

- **Failure branch**: sends `res.status(400).json(...)` and `return`s without calling `next()` — the request cycle stops here, exactly like `auth` and the field-presence `validate` do on failure.
- **Success branch**: `req.body = result.data` is the key bridging step. Zod's parsed `data` isn't just "the same body, confirmed valid" — it includes every transform and default the schema applied (trimmed strings, `active` defaulted to `true`). By overwriting `req.body`, every handler downstream (the controller, then the service) receives the *cleaned* value instead of the raw client input, without needing to know Zod was ever involved.

**Where it sits in the pipeline**

Because it only calls `next()` on success, `validateSchema` behaves as a gate, identical in spirit to `auth` and the existing `validate`: it's mounted before the controller, and only requests that satisfy the schema ever reach `bookingController.create` — malformed or missing fields never make it past this middleware into business logic or the repository.

--- 

# MASTERY

## 1. Duplicate Type Defs: AI often keeps writing manual "interface Booking" declarations alongside the Zod schema, meaning you have to update both files whenever a database column changes.

Summary of the change:

**`booking.schema.ts`** — added `bookingSchema` (extends `createBookingSchema` with `id: z.string()`) and:

```ts
export type Booking = z.infer<typeof bookingSchema>;
```

**`booking.repository.ts`** — deleted the manual `interface Booking`, now imports `Booking` from the schema. Updated seed data: `floor` changed from `number` (`1`, `2`) to `string` (`"Floor 1"`, `"Floor 2"`) to match the schema's `floor: z.string().trim().min(5).max(200)`.

**`booking.service.ts`**, **`booking.controller.ts`**, **`booking.routes.ts`** — all now import `Booking` from `../schemas/booking.schema` instead of the repository.

Now there's a single source of truth: if a field is added, removed, or retyped on `createBookingSchema` or `bookingSchema`, every layer (repository, service, controller, routes) picks up the new shape automatically via `z.infer`, with no manual interface to keep in sync. `npx tsc --noEmit` passed.

Made changes.

## 2. Middleware Exception Eating: AI often catches validation errors directly in the middleware and returns responses, bypassing the global error handler and cluttering route scopes.

Summary of the change:

**`validate.ts`** — `validateSchema` no longer sends a response itself:

```ts
export function validateSchema(schema: ZodSchema) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			req.body = schema.parse(req.body);
			next();
		} catch (error) {
			next(error);
		}
	};
}
```

- Switched from `safeParse` to `parse`, which throws a `ZodError` on failure.
- The `catch` block calls `next(error)` — passing the exception down the chain — instead of building a `res.status(400).json(...)` response directly in the middleware.

**`errorHandler.ts`** — now the single place that formats the `400` response for validation failures:

```ts
if (err instanceof ZodError) {
	res.status(400).json({ error: "Validation failed", details: err.issues });
	return;
}
```

Everything else (unknown errors) still falls through to the existing `500` response with server-side stack logging. This keeps `validateSchema` focused purely on parsing/transforming, while all response formatting for both validation and unexpected errors is centralized in `errorHandler`. TypeScript validation passed.

Made changes.

## 3. Swallowing Structured Errors: AI-generated error handlers often log ZodError objects as raw strings, returning an unhelpful "Internal Server Error" message to the user

## 4. Overwriting Clean Inputs: AI often uses schema.safeParse but forgets to reassign req.body to the resulting data, meaning the sanitised values (like trimmed strings) never make it to the controllers.
