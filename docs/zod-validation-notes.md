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

## 2. Building Zod Middleware:Understand how to construct a reusable middleware wrapper that bridges Zod schemas with Express request lifecycles.

--- 

# MASTERY