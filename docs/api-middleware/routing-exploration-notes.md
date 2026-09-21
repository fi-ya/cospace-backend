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

