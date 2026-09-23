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


### 3. Controller Payload Handling: Master the extraction and conversion of URL query parameters from strings into runtime integers.

---

## Step 3: MASTERY -> Parsing queries safely, preventing negative boundary errors, and calculating pages

### 1. Unsafe Number Conversions;
### 2. Missing Bounds Constraints:
### 3. Bulk Extraction Vulnerability
### 4. Broken Meta Calculations
### 5. Complete CRUD Errors

## Step 4: Showcase -> Performing boundary testing, invoking validation rules, and submitting clean git branches