# Routing exploration notes

## Learn how to define clear TypeScript structures for custom business data and initialise in-memory state.

I’ll use the current `Booking` model and mock array as the concrete example, checking the source once so the explanation matches the code exactly.

Read 

A TypeScript `interface` defines the shape of business data:

```ts
interface Booking {
  id: number;
  desk: string;
  floor: number;
  date: string;
  active: boolean;
}
```

Each property has a clear type:

- `id` is a number.
- `desk` is a desk name.
- `floor` is a number.
- `date` is an ISO date string.
- `active` records whether the booking is currently active.

The in-memory state is initialised with an explicitly typed array:

```ts
export const bookings: Booking[] = [
  { id: 1, desk: "Desk-01", floor: 1, date: "2026-09-21", active: true },
  { id: 2, desk: "Desk-02", floor: 1, date: "2026-09-22", active: true },
  { id: 3, desk: "Desk-03", floor: 2, date: "2026-09-23", active: false },
];
```

`Booking[]` means every array item must match the `Booking` interface. TypeScript will report an error if a field is missing or has the wrong type.

Because this data is stored in memory, it is temporary:

- It is available while the Node.js process runs.
- It can be imported by routes or services.
- Changes are lost when the server restarts.
- It is useful for early development before connecting the API to MySQL.

## Understand how to read incoming client variables from route parameters and request payloads.

Express provides incoming client variables through the `request` object.

**Route parameters**

For a route such as:

```ts
app.get(
  "/bookings/:id",
  (req: Request<{ id: string }>, res: Response) => {
    const bookingId = Number(req.params.id);
  },
);
```

A client request like:

```bash
curl http://localhost:5000/bookings/2
```

places `"2"` in:

```ts
req.params.id
```

Route parameters are strings, so the code converts the value to a number with `Number()` before comparing it with a booking ID.

**Request payloads**

For a JSON request body:

```ts
app.post(
  "/bookings",
  (req: Request<Record<string, never>, Booking, Booking>, res: Response) => {
    const newBooking = req.body;
    bookings.push(newBooking);
    res.status(201).json(newBooking);
  },
);
```

A client can send:

```bash
curl -X POST http://localhost:5000/bookings \
  -H "Content-Type: application/json" \
  -d '{"id":4,"desk":"Desk-04","floor":2,"date":"2026-09-24","active":true}'
```

The JSON payload is available through:

```ts
req.body
```

This works because the application registers the JSON parser:

```ts
app.use(express.json());
```

In summary:

```text
/bookings/:id       -> req.params.id
JSON request body   -> req.body
```

The TypeScript annotations document the expected structure, but runtime validation would still be needed before trusting arbitrary client input.

## Master the implementation logic behind modifying and removing in-memory state based on client identifiers.

The mutation routes use the client-supplied `id` to locate a booking in the in-memory array.

### 1. Extract the identifier

For a request such as:

```text
PUT /bookings/2
```

Express exposes the value through:

```ts
req.params.id
```

Route parameters are strings, so convert the ID before comparing it with the numeric `Booking.id`:

```ts
const bookingId = Number(req.params.id);
```

### 2. Find the array position

```ts
const bookingIndex = bookings.findIndex(
  ({ id }) => id === Number(req.params.id),
);
```

`findIndex()` returns:

- The array index when a matching booking exists.
- `-1` when no booking matches.

### 3. Replace an object with `PUT`

```ts
if (bookingIndex === -1) {
  res.status(404).json({ message: "Booking not found" });
  return;
}

bookings[bookingIndex] = req.body;
```

`PUT` replaces the complete object at the matching array position.

### 4. Modify one property with `PATCH`

```ts
const booking = bookings.find(({ id }) => id === Number(req.params.id));

if (!booking) {
  res.status(404).json({ message: "Booking not found" });
  return;
}

booking.active = !booking.active;
```

`PATCH` keeps the same booking object and changes only its `active` property.

### 5. Remove an object with `DELETE`

```ts
const [deletedBooking] = bookings.splice(bookingIndex, 1);
```

`splice()` mutates the original array:

- `bookingIndex` identifies where removal starts.
- `1` specifies that one item should be removed.
- The removed item is returned in an array.

This is why the code first checks for `-1`: calling `splice(-1, 1)` would accidentally remove the last booking.

## Mastery notes

## Issue: AI dumps all routing code directly into src/index.ts, making the entry point massive and unreadable.

*Fix:* Create a new folder structure: src/routes/. Inside it, create a file named bookings.ts. Move your Booking interface, your mock array, and your five routes into this file.

## Issue: AI rarely uses the modular Router class, which is vital for building clean, scalable directories.

*Fix:* in src/routes/bookings.ts, import Router from express. Initialise it with const router = Router(). Swap all your app.get or app.post calls to router.get and router.post. Export the router, and import it inside src/index.ts using app.use('/bookings', bookingRouter).

## Issue: AI almost always returns 200 OK for everything, which violates REST standards See RFC 2616 standards.

*Fix:*Update your DELETE route to use .status(204).send(). Ensure that if a booking is not found during a GET, PUT, or PATCH operation, you send a .status(404).json({ error: 'Booking not found' }) response

`204 No Content` is the better response for a successful deletion because the resource is gone and there is no response body to return. Standardise the requested missing-booking responses to the exact { error: "Booking not found" } shape.

## Issue: AI frequently leaves route parameters uncasted (e.g., matching a string ID with a number ID), leading to silent comparison failures.


*Fix:*Ensure your booking IDs are strings. When matching params inside your find/index operations, cleanly type your route parameters (e.g., req.params.id is a string). Ensure no references to the any keyword remain.
