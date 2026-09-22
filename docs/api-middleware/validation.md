# Validation

## 400: Desk Name Too Short

```bash
curl -sS -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"AB","floor":"Floor 1","date":"2026-09-25","active":true}'
```

Response:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":"Validation failed","fieldErrors":[{"field":"desk","message":"Too small: expected string to have >=3 characters"}]}
```

## 400: Invalid Date

```bash
curl -sS -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"Desk-05","floor":"Floor 1","date":"09/25/2026","active":true}'
```

Response:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":"Validation failed","fieldErrors":[{"field":"date","message":"Invalid ISO date"}]}
```

## Whitespace Trimming

Sent, with leading/trailing spaces on both `desk` and `floor`:

```bash
curl -sS -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"  Desk-99  ","floor":"Floor 3  ","date":"2026-09-26","active":true}'
```

Response (`201 Created`):

```json
{"desk":"Desk-99","floor":"Floor 3","date":"2026-09-26","active":true}
```

Stored record, confirmed via `GET /bookings`:

```json
{"desk":"Desk-99","floor":"Floor 3","date":"2026-09-26","active":true}
```

Both the response and the stored record show `desk` and `floor` with no leading or trailing whitespace, even though the client sent them padded with spaces. This works because `createBookingSchema` applies `.trim()` before the length checks, and `validateSchema` reassigns `req.body = schema.parse(req.body)`, so the controller, service, and repository all receive the trimmed value rather than the raw input.

Note: because `createBookingSchema` does not include an `id` field, this stored booking has no `id`. That is a separate, pre-existing gap unrelated to trimming and outside the scope of this validation check.

## Why the Schema Is the Source of the Type

```ts
export const createBookingSchema = z.object({
	desk: z.string().trim().min(3).max(100),
	floor: z.string().trim().min(5).max(200),
	date: z.string().date(),
	active: z.boolean().default(true),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

The Zod schema is the runtime source of truth: it is the thing that actually executes at request time, rejecting bad input and applying transforms like `.trim()` and `.default(true)`. A manually written `interface` has no runtime behavior — it only describes shape, and TypeScript erases it entirely at compile time.

If the type were written by hand instead, every rule change (a new required field, a different length limit, a new default) would need to be updated in two places: the interface and the schema, with no compiler error if they drifted apart. Deriving the type from the schema with `z.infer` means the validation rules and the TypeScript type can never disagree, because the type is generated directly from the same object that performs the validation.


--- 

# Showcase

## Field Constraint Validation: Walk through how the Zod schema intercepted the payload at the boundary and generated structured, user-friendly error logs.

Using the actual captured evidence in `validation.md` as the walkthrough:

**The boundary interception point**

```ts
router.post(
	"/",
	auth,
	validateSchema(createBookingSchema),
	(req, res) => bookingController.create(req, res),
);
```

`validateSchema(createBookingSchema)` sits directly in the route chain, after `auth` but before the controller ever runs. It's the exact boundary between "raw client input" and "trusted application data."

**Step 1: the payload arrives**

For the desk-length test:

```json
{"desk":"AB","floor":"Floor 1","date":"2026-09-25","active":true}
```

This is `req.body` — already JSON-parsed by `express.json()`, but not yet checked against any business rules.

**Step 2: Zod parses and rejects**

Inside `validateSchema`:

```ts
try {
	req.body = schema.parse(req.body);
	next();
} catch (error) {
	next(error);
}
```

`schema.parse(req.body)` runs `createBookingSchema`'s chain against every field simultaneously:

```ts
desk: z.string().trim().min(3).max(100),
date: z.string().date(),
```

For `"AB"`, `.trim()` doesn't change anything (no whitespace), then `.min(3)` fails because the string is only 2 characters. Zod doesn't just return `false` — it throws a `ZodError` carrying an `issues` array, where each issue records the failing field's `path` and a human-readable `message`.

Because `parse` throws rather than returning a result object, the `catch` block catches it and calls:

```ts
next(error);
```

This is the interception in action: the request never reaches `bookingController.create`. It's diverted straight to Express's error-handling chain.

**Step 3: the global error handler formats the log**

```ts
if (err instanceof ZodError) {
	const fieldErrors = err.issues.map((issue) => ({
		field: issue.path.join("."),
		message: issue.message,
	}));

	res.status(400).json({ error: "Validation failed", fieldErrors });
	return;
}
```

The type guard `err instanceof ZodError` distinguishes a validation failure from any other runtime error. `err.issues` is Zod's raw, verbose diagnostic array (containing internal `code` values, `path` as an array, etc.) — the `.map()` step converts it into the clean shape actually shown to the client:

```json
{"error":"Validation failed","fieldErrors":[{"field":"desk","message":"Too small: expected string to have >=3 characters"}]}
```

`issue.path.join(".")` matters here because Zod paths are arrays (to support nested objects like `path: ["address", "city"]`), so joining with `.` produces a readable single string (`"desk"`) instead of forcing the client to interpret an array.

**The same mechanism, different field**

The invalid-date case in the doc follows an identical path — `date: z.string().date()` fails its format check, producing `{"field":"date","message":"Invalid ISO date"}` — proving the interception and formatting logic is generic across every field in the schema, not hardcoded per field.

**Why this counts as "structured, user-friendly"**

The client never sees Zod's internal issue codes, stack traces, or the raw exception object — only a field name and a plain-English reason. That transformation from raw Zod diagnostics to `{ field, message }` pairs is entirely what happens between the `throw` inside `validateSchema` and the `res.status(400).json(...)` inside `errorHandler`.

## Invalid ISO Date Formats: Explain why validating date strings at the network edge prevents silent parsing failures inside our database layers or chronological calculations.

Without a network-edge check, a bad date string can travel deep into the system before anything notices something is wrong.

**What "the network edge" means here**

```ts
router.post(
	"/",
	auth,
	validateSchema(createBookingSchema),
	(req, res) => bookingController.create(req, res),
);
```

`validateSchema(createBookingSchema)` runs immediately after the request enters the API — before the controller, service, or repository ever see `req.body`. This is the earliest possible point to reject bad data.

**What happens without the check**

If `date: z.string().date()` weren't there, a payload like:

```json
{"desk":"Desk-05","floor":"Floor 1","date":"09/25/2026","active":true}
```

would flow straight through:

```ts
bookings.push(booking); // BookingRepository.create
```

The in-memory array would now hold `"date": "09/25/2026"` as a plain string — syntactically valid JavaScript, semantically meaningless as a calendar date, and stored right alongside correctly formatted ISO records like `"2026-09-21"`.

**Where the failure would resurface — silently**

The danger isn't that this crashes immediately. It's that nothing errors at write time, so the bad value sits quietly in storage until something tries to *use* it as a date:

- A future `ORDER BY booking_date` or in-memory `.sort()` comparing date strings lexicographically would produce a wrong order the moment formats are mixed (`"09/25/2026"` sorts differently than `"2026-09-21"` as plain strings).
- A future feature computing "is this booking today or in the future" via `new Date(booking.date)` would either throw, or worse, silently parse `"09/25/2026"` as a *different, unintended* date depending on the JS engine's locale-dependent fallback parsing.
- The `schema.md` design specifies `booking_date DATE NOT NULL` in MySQL with a `UNIQUE(desk_id, booking_date)` constraint — if this API is ever wired to that schema, an unparseable date string would fail at the database layer instead, but with a much less specific error, far from the original client request that caused it.

**Why catching it early matters**

By rejecting at the edge:

```json
{"field":"date","message":"Invalid ISO date"}
```

the client gets immediate, specific feedback tied to the exact request that caused the problem. The failure is loud and attributable, rather than silent and discovered later — potentially by a different developer, in a different part of the system, days after the bad record was written, with no easy way to trace it back to the original request.

**Why this is safer than trusting downstream code**

Every layer downstream (`BookingService`, `BookingRepository`, any future date-arithmetic or reporting query) can now assume `date` is always a valid ISO string, without re-checking it. That assumption only holds because the network edge enforced it once, for every possible entry point into the system.

## Dynamic Input Sanitisation: Show how the middleware captured the Zod output and dynamically reassigned req.body to preserve our sanitised string transformations.

Using `validate.ts` and the whitespace evidence already captured in `validation.md`:

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

**Capturing the Zod output**

`schema.parse(req.body)` doesn't just validate — it *returns a new value*, the parsed result of running every transform in the chain against the input:

```ts
desk: z.string().trim().min(3).max(100),
```

For the client payload `"  Desk-99  "`, Zod's internal steps were: run `.trim()` first (transform), producing `"Desk-99"`, then check `.min(3)` and `.max(100)` against that trimmed string. The value returned by `parse()` is the *post-trim* string, not the original padded one — the original is discarded once validation succeeds.

That return value is captured directly:

```ts
req.body = schema.parse(req.body);
```

There's no intermediate variable named `parsedData` in this implementation — the assignment happens in the same expression as the call, which is what "captured the Zod output" means concretely here: the function call's return value is taken immediately and written into `req.body`.

**Why reassignment (not mutation) is required**

Zod does not mutate the object you pass in. `req.body` before this line still holds the raw, padded `"  Desk-99  "`. If the middleware only called `schema.parse(req.body)` without assigning the result anywhere, the trimmed value would be computed, then immediately discarded — `req.body` downstream would still contain the untrimmed original. This is exactly the bug pattern this middleware is written to avoid.

**Dynamic in the sense of generic reuse**

The word "dynamically" applies because `validateSchema` doesn't know in advance which fields exist or which transforms apply — it's generic over any `ZodSchema` passed to it:

```ts
validateSchema(createBookingSchema)
```

Whatever shape `createBookingSchema` describes (three fields today, more tomorrow), the same `req.body = schema.parse(req.body)` line captures whatever the schema produces, without the middleware itself hardcoding `desk` or `floor` anywhere.

**Preserving the transformation downstream**

Once `next()` is called, `bookingController.create` receives `req.body` — which is now the *reassigned*, trimmed object, not the original request payload. This is confirmed by the actual response in `validation.md`:

```json
{"desk":"Desk-99","floor":"Floor 3","date":"2026-09-26","active":true}
```

The controller, service, and repository all operate on this already-sanitised object. None of them re-trim anything — the sanitisation happened exactly once, at the middleware boundary, and survives for the rest of the request lifecycle purely because `req.body` was reassigned rather than left pointing at the original client-supplied value.

## Automated Type Inference: Explain how dynamic type inference eliminates human typing errors and ensures our API documentation, runtime validation, and compiler rules always match.

Using `booking.schema.ts` as the concrete example:

```ts
export const createBookingSchema = z.object({
	desk: z.string().trim().min(3).max(100),
	floor: z.string().trim().min(5).max(200),
	date: z.string().date(),
	active: z.boolean().default(true),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

**The manual-duplication problem this replaces**

Without `z.infer`, a developer would maintain two independent descriptions of the same shape:

```ts
// runtime rules
const createBookingSchema = z.object({ desk: z.string().trim().min(3).max(100), ... });

// compile-time shape, written separately by hand
interface CreateBookingInput {
	desk: string;
	floor: string;
	date: string;
	active?: boolean;
}
```

Every time a rule changes — `floor` becomes optional, `active` is removed, a new `notes` field is added — a human has to remember to update *both* places. Nothing forces this to happen. If the interface is forgotten or gets it slightly wrong (say, `active: boolean` instead of `active?: boolean`, missing that `.default(true)` makes it optional on input), the compiler has no way to know the two have diverged — it only ever checks the interface against itself, never against the schema.

**What `z.infer` changes**

```ts
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

This doesn't write a type by hand at all — it asks TypeScript to *read the schema's own definition* and derive the type mechanically. There is only one artifact describing the shape: `createBookingSchema`. `CreateBookingInput` is a projection of it, not an independent parallel copy. If `floor` were changed to `z.number()` tomorrow, `CreateBookingInput["floor"]` becomes `number` automatically, everywhere it's used, without touching a single line outside `booking.schema.ts`.

**Why this keeps three things in sync simultaneously**

- **Runtime validation**: `createBookingSchema.parse(req.body)` — the actual rules enforced against real requests (as verified in this doc's `400` responses for a short `desk` and an invalid `date`).
- **Compiler rules**: `CreateBookingInput` (and `Booking`, extended with `id`) — used throughout `booking.repository.ts`, `booking.service.ts`, `booking.controller.ts`, and `booking.routes.ts`. Because it's inferred, editing the schema immediately produces new TypeScript errors anywhere the old shape was assumed (e.g. a service method expecting a field that no longer exists), catching the mismatch at compile time instead of at runtime.
- **API documentation**: since `desk: z.string().trim().min(3).max(100)` is a single, explicit, self-documenting declaration, it can be the direct source for generating documentation (constraints, types, defaults) rather than a human transcribing the same constraints into a separate markdown table that can silently drift out of date, as this project's own `validation.md` already demonstrates by quoting the schema directly rather than re-describing it.

**The human-error elimination**

The category of bug this removes is specifically "the schema says one thing, the type says another, and nobody noticed." Because the type is a mechanical derivation rather than an independent transcription, that category of mistake becomes structurally impossible — there is no second, hand-written version to get out of sync with the first.
