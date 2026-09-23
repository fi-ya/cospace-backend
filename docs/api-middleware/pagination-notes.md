# Data Access / Pagination 

In this session, we will implement complete, production-grade CRUD (Create, Read, Update, Delete) operations and set up Offset Pagination. We will learn how to parse search filters and split our datasets into discrete, manageable pages that can be consumed safely by frontend clients. 

## Step 1: Data Access & Pagination Strategy: Understanding query parsing, offset calculations, and metadata response design
URL Query Parameters -> `GET /bookings?page=2&limit=10`
Limit Value
Skip Offset
Total Pages
```js
{
  "data": [
    { "id": "11", "desk": "Window Desk A", "floor": "Floor 2, North Wing" }
  ],
  "meta": {
    "totalItems": 25,
    "itemsPerPage": 10,
    "currentPage": 2,
    "totalPages": 3
  }
}
```

## Step 2: EXPOLRE-> Scaffolding paginated methods across our repository, service, and controller layers

### 1. Repository Pagination Methods: Learn how to slice arrays or query subsets of data based on dynamic skip and limit variables.
- `findPaginated(skip, limit)` slices the array starting at skip, taking limit items — standard offset-based pagination.
- `count()` returns the total array length, for computing total pages `(Math.ceil(count() / limit))`.

Using `findPaginated` in `booking.repository.ts` as the concrete example:

```ts
findPaginated(skip: number, limit: number): Booking[] {
	return this.bookings.slice(skip, skip + limit);
}
```

**How `Array.prototype.slice` works here**

`slice(start, end)` returns a new array containing elements from index `start` up to, but not including, index `end`. It never mutates the original array — `this.bookings` stays intact after every call.

- `skip` becomes the `start` index — how many items to skip from the beginning.
- `skip + limit` becomes the `end` index — the boundary where slicing stops.

**Walking through concrete numbers**

With three bookings (indices `0`, `1`, `2`):

```ts
findPaginated(0, 2)
// slice(0, 2) -> bookings at index 0 and 1 -> "page 1" of size 2

findPaginated(2, 2)
// slice(2, 4) -> bookings at index 2 only (index 3 doesn't exist) -> "page 2"
```

Note that `slice` doesn't throw if `end` exceeds the array length — it just returns whatever elements actually exist up to the array's end. This is why `slice(2, 4)` safely returns one item instead of erroring, even though there's no index `3`.

**Translating "page number" into skip/limit**

This method takes `skip`/`limit` directly rather than a page number, because that's the more primitive, reusable form. A caller (typically the service or controller layer) converts a page number into these two values:

```ts
const page = 2;
const limit = 10;
const skip = (page - 1) * limit; // skip = 10

bookingRepository.findPaginated(skip, limit);
```

- Page 1 → `skip = 0` → first 10 items.
- Page 2 → `skip = 10` → items 10 through 19.
- Page 3 → `skip = 20` → items 20 through 29.

**Why `skip`/`limit` instead of hardcoding page size**

Because both are parameters rather than constants, the same method serves any page size or offset without modification — a client requesting `?page=1&pageSize=5` and another requesting `?page=3&pageSize=20` both go through the identical `findPaginated(skip, limit)` call, just with different numbers computed from their query parameters.

**Why `count()` exists alongside it**

```ts
count(): number {
	return this.bookings.length;
}
```

`findPaginated` only knows how to return *a slice* — it has no way to tell the caller how many total items exist beyond what's visible in that slice. `count()` answers that separately, so the caller can compute:

```ts
const totalPages = Math.ceil(bookingRepository.count() / limit);
```

Keeping `count()` as its own method (rather than baking a total into `findPaginated`'s return value) keeps the two concerns — "give me this page" and "how many pages exist" — independently testable and reusable.


### 2. Service Logic Integration: Understand how to aggregate raw data arrays and calculate mathematical metadata counts inside our business layer.

- Converts page to skip ((page - 1) * limit), then delegates the slicing to `bookingRepository.findPaginated`.
- Uses `count()` to compute totalPages via `Math.ceil`.
- Returned shape (data + meta with totalItems, itemsPerPage, currentPage, totalPages) matches the pagination convention documented in the project's copilot-instructions.

Using `getPaginatedShifts` in `booking.service.ts` as the concrete example:

```ts
getPaginatedShifts(page: number, limit: number) {
	const totalItems = this.bookingRepository.count();
	const skip = (page - 1) * limit;
	const data = this.bookingRepository.findPaginated(skip, limit);
	const totalPages = Math.ceil(totalItems / limit);

	return {
		data,
		meta: { totalItems, itemsPerPage: limit, currentPage: page, totalPages },
	};
}
```

**Aggregating the raw data**

`this.bookingRepository.findPaginated(skip, limit)` fetches only the *slice* of bookings relevant to this page — the repository doesn't know anything about pages, totals, or metadata, it only knows how to slice an array. The service is the layer that decides what page means and translates it into the repository's primitive `skip`/`limit` interface:

```ts
const skip = (page - 1) * limit;
```

This is a pure calculation with no side effects: `page` is a business-facing concept (`"give me page 2"`), `skip` is a storage-facing concept (`"give me items starting at index 10"`). The service is where that translation lives, because neither the repository (too low-level) nor the controller (too HTTP-focused) is the right place for it.

**Calculating metadata separately from fetching data**

```ts
const totalItems = this.bookingRepository.count();
```

Notice this is a completely separate call from `findPaginated`. The array slice returned by `findPaginated` only ever contains up to `limit` items — there's no way to derive "how many bookings exist in total" from a 10-item slice alone. That's why `count()` exists as its own repository method: it queries the *entire* dataset's size, independent of whatever page is being requested.

**The math that turns raw counts into metadata**

```ts
const totalPages = Math.ceil(totalItems / limit);
```

This is the core aggregation step: dividing the total item count by the page size gives a fractional number of pages (e.g. `23 / 10 = 2.3`), and `Math.ceil` rounds that up to `3`, because a partial page still counts as a full page from the client's perspective. Using `Math.floor` here would be wrong — it would silently drop the last, partially-filled page from the reported total.

**Why this belongs in the business layer, not the controller**

The controller's job is to read HTTP query parameters and format an HTTP response; it shouldn't contain pagination arithmetic. The repository's job is to store and retrieve bookings; it shouldn't know what "total pages" means as a concept. The service sits in between specifically because pagination metadata (`totalItems`, `totalPages`) is a *business rule about the shape of a paginated response*, not a storage detail and not an HTTP detail — it's the layer responsible for combining two independent repository queries (`count()` and `findPaginated()`) into one coherent, structured result the controller can serialize as-is.

### 3. Controller Payload Handling: Master the extraction and conversion of URL query parameters from strings into runtime integers.

- `Number(req.query.page) || 1` — falls back to 1 when page is missing or NaN.
- `Number(req.query.limit) || 10` — falls back to 10 per the project's documented default page size, then Math.min(..., 50) enforces the documented maximum of 50.
- Passes both to getPaginatedShifts and returns the { data, meta } payload directly.
- Verified live: GET /bookings (no params) returned meta.itemsPerPage: 10, currentPage: 1; GET `/bookings?page=2&limit=1` returned the correct second item with totalPages

Using `getAll` in `booking.controller.ts` as the concrete example:

```ts
const page = Number(req.query.page) || 1;
const limit = Math.min(Number(req.query.limit) || 10, 50);
```

**Why extraction is needed at all**

Express parses URL query strings into `req.query`, but every value there is a *string* (or nested object/array for complex query strings) — never a number. For:

```ts
GET /bookings?page=2&limit=1
```

`req.query.page` is the string `"2"`, not the number `2`. If you passed this string straight to `getPaginatedShifts`, the arithmetic inside the service (`(page - 1) * limit`) would still technically work in JavaScript due to implicit coercion, but it's fragile and TypeScript's type system doesn't sanction it — `getPaginatedShifts(page: number, limit: number)` expects real numbers, not `string | ParsedQs`.

**The conversion step**

```ts
Number(req.query.page)
```

`Number()` is a built-in conversion function: given a numeric-looking string like `"2"`, it returns `2`. Given something non-numeric (`undefined`, `""`, `"abc"`), it returns `NaN`.

**Handling missing or invalid values**

```ts
Number(req.query.page) || 1
```

This is where the fallback default comes in. `NaN` is falsy in JavaScript, and so is `0` and `undefined`. The `||` operator evaluates the left side first; if it's falsy, it evaluates and returns the right side instead:

- `req.query.page` missing → `Number(undefined)` → `NaN` → falsy → falls back to `1`.
- `req.query.page = "abc"` → `Number("abc")` → `NaN` → falsy → falls back to `1`.
- `req.query.page = "2"` → `Number("2")` → `2` → truthy → keeps `2`.

**Enforcing an upper bound alongside the conversion**

```ts
Math.min(Number(req.query.limit) || 10, 50)
```

This chains two operations: first the same string→number conversion with a `10` fallback, then `Math.min(value, 50)` clamps the result so it can never exceed `50`, regardless of what the client requested (`?limit=1000` becomes `50`). This directly matches the project's documented convention: default page size `10`, maximum `50`.

**Why this happens in the controller, not deeper layers**

`req.query` only exists at the HTTP boundary — `BookingService.getPaginatedShifts` and `BookingRepository.findPaginated` both operate on plain `number` parameters and have no knowledge of Express or query strings at all. The controller is exactly the layer responsible for this string-to-number extraction, because it's the only layer that ever touches `req` directly; everything below it receives already-converted, already-defaulted numeric values.

---

## Step 3: MASTERY -> Parsing queries safely, preventing negative boundary errors, and calculating pages
They often trust client-provided queries blindly, leading to NaN (Not-a-Number) runtime crashes, allow negative page numbers that break array slicing, or fail to enforce maximum limit restrictions, leaving the server vulnerable to bulk extraction requests.

### 1. Unsafe Number Conversions; - fix applied ->  `?page=abc?limit=`,

Ran terminal command:  curl -sS 'http://localhost:5000/bookings?page=abc&limit=xyz'
Ran terminal command:  curl -sS 'http://localhost:5000/bookings?page=2&limit=1'
Both confirmed: `?page=abc&limit=xyz` safely falls back to `currentPage: 1, itemsPerPage: 10` instead of crashing; valid `?page=2&limit=1` still works correctly. Stopping the temporary server.    

Updated `booking.controller.ts` with a reusable validation utility:

```ts
private parseIntWithDefault(value: unknown, defaultValue: number): number {
	const parsed = parseInt(String(value), 10);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

getAll = (req: Request, res: Response): void => {
	const page = this.parseIntWithDefault(req.query.page, 1);
	const limit = Math.min(this.parseIntWithDefault(req.query.limit, 10), 50);
	...
};
```

- `parseInt(String(value), 10)` uses base-10 radix explicitly, avoiding octal/hex ambiguity for strings like `"010"`.
- `Number.isNaN(parsed)` explicitly checks for parse failure and returns the caller-provided default (`1` for page, `10` for limit) — clearer intent than relying on `||`'s falsy coercion (which also happens to treat `0` as "missing," a subtle gotcha the explicit check avoids).
- Verified live: `?page=abc&limit=xyz` safely falls back to `currentPage: 1, itemsPerPage: 10` instead of producing `NaN` anywhere in the pipeline; valid numeric params still behave correctly.

### 2. Missing Bounds Constraints: - FIX APPLIED -> fixes: `page=0` and negative values: 

Ran terminal command:  curl -sS 'http://localhost:5000/bookings?page=0&limit=-5'
Ran terminal command:  curl -sS 'http://localhost:5000/bookings?page=-3&limit=0'

Both cases confirmed: `page=0` and `page=-3` are both clamped to `currentPage: 1`; `limit=-5` and `limit=0` are both clamped to `itemsPerPage: 1`. No negative offsets reach the slicing logic. Stopping the server.     

Updated `booking.controller.ts`:

```ts
const page = Math.max(this.parseIntWithDefault(req.query.page, 1), 1);
const limit = Math.min(
	Math.max(this.parseIntWithDefault(req.query.limit, 10), 1),
	50,
);
```

- `Math.max(..., 1)` on `page` forces `0` or any negative value up to `1`.
- `Math.max(..., 1)` on `limit`, wrapped inside the existing `Math.min(..., 50)`, enforces the range `[1, 50]` — floors negative/zero limits to `1` while still capping oversized requests at `50`.

Verified live: `?page=0&limit=-5` → `currentPage: 1, itemsPerPage: 1`; `?page=-3&limit=0` → same clamped result. No negative `skip` values can reach `bookingRepository.findPaginated`. TypeScript validation passed.

### 3. Bulk Extraction Vulnerability -> No change required


This ceiling is already in place from the previous change — `Math.min(..., 50)`. Let me verify with the specific attack scenario described (`?limit=1000000`):   

Ran terminal command:  curl -sS 'http://localhost:5000/bookings?limit=1000000'

Confirmed: `?limit=1000000` returns `itemsPerPage: 50`, not `1000000` — the ceiling holds regardless of how large the client-requested value is. Stopping the server.     

```ts
const limit = Math.min(
	Math.max(this.parseIntWithDefault(req.query.limit, 10), 1),
	50,
);
```

Verified live against the exact attack scenario: `?limit=1000000` returns `itemsPerPage: 50`, not `1000000`. The ceiling is a hard cap applied unconditionally in the controller, so no requested value (however large) can bypass it before reaching `BookingService.getPaginatedShifts` or `BookingRepository.findPaginated`.

### 4. Broken Meta Calculations -> No change required

Already correct — no change needed. `getPaginatedShifts` already uses `Math.ceil(totalItems / limit)`, so:

```ts
const totalPages = Math.ceil(totalItems / limit);
```

For 21 bookings with `limit=10`: `21 / 10 = 2.1` → `Math.ceil(2.1) = 3`, correctly counting the partial 11th–21st page as a full third page rather than truncating it. `Math.floor` or plain integer division would have silently dropped that final partial page from the total. 

### 5. Complete CRUD Errors - No change required

Already correct — no change needed. `BookingService.update` and `BookingService.delete` both propagate `undefined` when the repository's `findIndex` returns `-1` (no matching `id`):

```ts
update(id: string, data: Partial<Booking>): Booking | undefined {
	return this.bookingRepository.update(id, data);
}

delete(id: string): Booking | undefined {
	return this.bookingRepository.delete(id);
}
```

And both controller methods already check for that `undefined` and translate it into a `404` before attempting any further logic:

```ts
const booking = this.bookingService.update(req.params.id, req.body);

if (!booking) {
	res.status(404).json({ error: "Booking not found" });
	return;
}
```

```ts
const booking = this.bookingService.delete(req.params.id);

if (!booking) {
	res.status(404).json({ error: "Booking not found" });
	return;
}
```

This satisfies the "return undefined for the controller to handle as 404" approach — the service never mutates data for a non-existent `id` (the repository's own `findIndex === -1` guard prevents any array write), so the data state stays clean. 

## Step 4: Showcase -> Performing boundary testing, invoking validation rules, and submitting clean git branches

### 1. Offset Pagination Tracing: Explain how the server calculates the skip offset behind the scenes to slice out distinct elements of the array without duplicate items.

Using `getPaginatedShifts` and `findPaginated` together as the concrete example:

```ts
// booking.service.ts
const skip = (page - 1) * limit;
const data = this.bookingRepository.findPaginated(skip, limit);

// booking.repository.ts
findPaginated(skip: number, limit: number): Booking[] {
	return this.bookings.slice(skip, skip + limit);
}
```

**The core formula**

```ts
skip = (page - 1) * limit
```

The `-1` is what makes page numbering start at `1` for humans while indices start at `0` internally. Page `1` should skip *nothing*, so subtracting 1 before multiplying converts a 1-based page number into a 0-based offset.

**Walking through concrete numbers (limit = 10)**

| page | `(page - 1) * limit` | skip | slice range | items covered |
|---|---|---|---|---|
| 1 | `(1-1) * 10` | 0 | `slice(0, 10)` | indices 0–9 |
| 2 | `(2-1) * 10` | 10 | `slice(10, 20)` | indices 10–19 |
| 3 | `(3-1) * 10` | 20 | `slice(20, 30)` | indices 20–29 |

**Why this produces distinct, non-overlapping slices**

Each page's `skip` value is exactly `limit` greater than the previous page's `skip`. That's the guarantee against duplicates: page 1 covers indices `[0, 10)`, page 2 covers `[10, 20)` — the boundary at index `10` belongs to page 2 only, because `slice(0, 10)` is exclusive of its end index. There's no index that ever falls into two different pages' ranges, and no index between pages is skipped over entirely, as long as `limit` stays constant across requests.

**Why `end = skip + limit`, not a separate variable**

```ts
this.bookings.slice(skip, skip + limit)
```

`slice`'s second argument is the *exclusive end index*, so adding `limit` to `skip` naturally produces "however many items past the starting offset." This is why the repository method only needs two parameters (`skip`, `limit`) rather than three (`start`, `end`, `limit`) — the end boundary is always derivable from the other two.

**What happens at the tail end of the array**

If `totalItems = 3` and a client requests `page = 1, limit = 10`:

```ts
skip = 0
this.bookings.slice(0, 10)
```

`slice` doesn't error when `end` exceeds the array's actual length — it simply returns everything available from `skip` onward (all 3 items here), rather than padding with `undefined` or throwing. This is why no special-casing is needed for the last page: the same formula that works for full pages also correctly returns a partial final page.

### 2. Parameter Validation Guard: Describe how robust query sanitisation prevents runtime calculations from failing on invalid string inputs.
Using `parseIntWithDefault` and the `Math.max`/`Math.min` clamps in `booking.controller.ts` as the concrete example:

```ts
private parseIntWithDefault(value: unknown, defaultValue: number): number {
	const parsed = parseInt(String(value), 10);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

getAll = (req: Request, res: Response): void => {
	const page = Math.max(this.parseIntWithDefault(req.query.page, 1), 1);
	const limit = Math.min(
		Math.max(this.parseIntWithDefault(req.query.limit, 10), 1),
		50,
	);

	const result = this.bookingService.getPaginatedShifts(page, limit);
	...
};
```

**What "invalid string input" actually looks like at this boundary**

`req.query` values are always strings (or absent) — there's no type enforcement on a URL. A client can send `?page=abc`, `?page=`, `?page=-3`, or omit `page` entirely, and Express will hand all of these to the controller without complaint.

**Sanitisation step 1: eliminating `NaN` before it can propagate**

```ts
const parsed = parseInt(String(value), 10);
return Number.isNaN(parsed) ? defaultValue : parsed;
```

`parseInt("abc", 10)` produces `NaN`. If that `NaN` were allowed to flow downstream unchecked, every arithmetic operation that touches it becomes `NaN` too — `(page - 1) * limit` becomes `NaN`, `this.bookings.slice(NaN, NaN)` returns an empty array with no error thrown, and the client silently gets zero results with no indication anything went wrong. The `Number.isNaN` check catches this at the very first point the string is converted, substituting a safe default (`1` or `10`) instead of letting the invalid value travel any further.

**Sanitisation step 2: eliminating out-of-range numbers, not just non-numbers**

A string like `"0"` or `"-3"` parses to a perfectly valid *number* — `parseInt` succeeds, `Number.isNaN` is `false` — but it's still semantically invalid for pagination. This is why sanitisation doesn't stop at "is it a number?":

```ts
Math.max(parsedPage, 1)
```

forces any page `≤ 0` up to `1`, and:

```ts
Math.min(Math.max(parsedLimit, 1), 50)
```

forces `limit` into the closed range `[1, 50]` regardless of what was requested (`0`, `-5`, or `1000000`).

**Why this prevents calculation failures specifically**

The downstream calculation:

```ts
const skip = (page - 1) * limit;
```

only produces a valid, non-negative array offset because `page` and `limit` have already been guaranteed to be real, positive numbers by the time this line runs. Without that guarantee, a negative `page` would produce a negative `skip`, and `this.bookings.slice(-10, ...)` interprets negative indices as "count from the end of the array" — silently returning the *wrong* elements rather than throwing an error, which is arguably worse than a crash because the bug is invisible until someone notices the returned data doesn't match the requested page.

**The overall effect**

By the time `page` and `limit` reach `bookingService.getPaginatedShifts`, they are guaranteed to be well-formed integers within a known safe range — every layer beneath the controller (`BookingService`, `BookingRepository`) can perform its arithmetic without any additional validation, because the boundary sanitisation has already ruled out every input shape that could cause `NaN`, negative offsets, or unbounded memory use.

### 3. CRUD Lifecycle Demonstration: Walk through how our architectural layers cooperate to ensure all CRUD changes are checked, validated, and logged from start to finish.

Read , lines 1 to 25

Read 

Using an actual `POST /bookings` request as the concrete walkthrough, since it exercises every layer in this codebase:

**1. Global middleware (`index.ts`)**

```ts
app.use(express.json());
app.use(logger);
```

Every request, regardless of route, passes through these first. `express.json()` parses the raw request body into `req.body`. `logger` then records the method, path, and timestamp to the console before calling `next()` — this is the "logged from start" part, and it happens unconditionally, before the request even reaches route matching.

**2. Route-level middleware chain (`booking.routes.ts`)**

```ts
router.post(
	"/",
	auth,
	validateSchema(createBookingSchema),
	(req, res) => bookingController.create(req, res),
);
```

For `POST /bookings` specifically, two more gatekeepers run in order:

- `auth` checks the `Authorization` header. If it doesn't match, it responds `401` directly and calls `next()` never — the chain stops here, and nothing below (validation, controller, service, repository) ever executes.
- `validateSchema(createBookingSchema)` runs only if `auth` passed. It parses `req.body` against the Zod schema, reassigns `req.body` to the sanitised result (trimmed strings, defaulted `active`), and calls `next()` — or, on failure, calls `next(error)` with a `ZodError`, diverting straight to the global error handler instead of the controller.

**3. Controller (`booking.controller.ts`)**

```ts
create = (req, res): void => {
	try {
		const booking = this.bookingService.create(req.body);
		res.status(201).json(booking);
	} catch (error: unknown) {
		res.status(400).json({ error: this.getErrorMessage(error) });
	}
};
```

By the time execution reaches here, `req.body` is guaranteed to be the already-validated, already-sanitised object. The controller's only job is to extract it and hand it to the service, then translate whatever comes back into an HTTP response.

**4. Service (`booking.service.ts`)**

```ts
create(booking: Booking): Booking {
	if (booking.desk.length < 3) {
		throw new Error("Desk name must be at least 3 characters long");
	}

	return this.bookingRepository.create(booking);
}
```

This is a second, independent check — business-rule validation, distinct from the schema's structural validation. Even though `validateSchema` already enforced `desk.length >= 3` via Zod, the service layer doesn't rely on that; it re-asserts the rule itself so this class remains correct even if called from somewhere that skipped the middleware (a test, a script, a future internal call).

**5. Repository (`booking.repository.ts`)**

```ts
create(booking: Booking): Booking {
	this.bookings.push(booking);
	return booking;
}
```

Only after both the middleware chain and the service's business check succeed does the in-memory array actually get mutated. This is the last link in the chain — pure storage, no validation logic of its own.

**6. Errors flow back through the same layers**

If anything fails at any point — `auth` rejects the header, `validateSchema` throws a `ZodError`, or `BookingService.create` throws its business error — the response is generated by whichever layer detected the problem (`auth`/`validateSchema` divert to `errorHandler`; the service's thrown `Error` is caught by the controller's own `try/catch`). Either way, the request never reaches the repository, so the in-memory array is never mutated by a request that failed validation.

**Why this layering matters for "checked, validated, and logged from start to finish"**

Every request is logged once, globally, regardless of outcome. Every mutating request passes through authentication and schema validation before the controller. Every create/update operation passes through a second, independent business-rule check in the service. And the repository — the only layer that actually changes state — is never reached unless every preceding check passed. No single layer is trusted to catch everything; each one enforces its own concern, and a failure at any point stops the request before it can corrupt stored data.


### 4. Accurate Metadata Verification: Explain why returning metadata alongside raw arrays is vital for frontend UI engineers to build responsive pagination controls.

Using the actual response shape returned by this API as the concrete example:

```json
{
  "data": [{ "id": "2", "desk": "Desk-02", "floor": "Floor 1", "date": "2026-09-22", "active": true }],
  "meta": { "totalItems": 3, "itemsPerPage": 1, "currentPage": 2, "totalPages": 3 }
}
```

**What the raw array alone cannot tell a frontend**

If the API only returned `data` — just the array of bookings for the current page — a frontend has no way to answer basic UI questions:

- "Is there a next page?" — the array of 1 item on page 2 looks identical whether there are 3 total bookings or 3,000. A frontend can't distinguish "this is the last page" from "there happen to be exactly this many items on every page."
- "How many pages should the pagination control render?" — without a total count, there's no way to draw page number buttons (`1 2 3 ...`) or know when to stop.
- "What page am I currently viewing?" — if the frontend's own request state gets out of sync (e.g. after a refresh), there's no server-confirmed value to reconcile against.

**What each `meta` field answers directly**

```json
"meta": { "totalItems": 3, "itemsPerPage": 1, "currentPage": 2, "totalPages": 3 }
```

- `totalItems` — lets the UI show "3 results" or "showing 2 of 3", without the frontend needing to make a separate `count`-only request.
- `itemsPerPage` — confirms what the server actually applied (recall the earlier ceiling: a client requesting `?limit=1000000` gets back `itemsPerPage: 50`, not their requested value). The frontend can detect and reflect the *actual* enforced limit rather than assuming its own request was honored exactly.
- `currentPage` — echoes back which page the server believes it served, letting the UI highlight the correct page number in a pager component.
- `totalPages` — the single number needed to decide whether "Next" should be disabled (`currentPage === totalPages`) and how many page buttons to render.

**Why this must come from the server, not be inferred client-side**

`totalPages` in this API is computed once, server-side, via:

```ts
const totalPages = Math.ceil(totalItems / limit);
```

using the *actual* `totalItems` count from `bookingRepository.count()` — a count the frontend has no direct way to obtain from a single page of data. If the frontend tried to guess `totalPages` by, say, assuming "if I got a full page of items, there's probably more," that guess breaks the moment `totalItems` is exactly divisible by `limit` (e.g. exactly 30 items with `limit=10` — is page 3 the last one, or is there a page 4 with zero items?). Only the server, which has visibility into the entire dataset via `count()`, can answer this unambiguously.

**The practical UI consequence**

Without `meta`, a frontend engineer building "Previous / Page 2 of ? / Next" controls would either have to make an extra round-trip just to fetch a total count, guess at pagination boundaries (risking an off-by-one "Next" button that leads to an empty page), or disable pagination controls entirely and just show "Load more" with no indication of total size. Bundling `meta` into the same response the data already comes from means the pagination UI can render correctly and completely from a single request, with server-verified numbers rather than client-side assumptions.