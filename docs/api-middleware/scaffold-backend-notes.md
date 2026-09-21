# Explore notes

## Learn how to isolate simple array manipulation and retrieval logic inside a dedicated class.

I’ll use the new repository class as the concrete example and explain how it isolates storage and array operations from the Express routes.

Read 

A repository class isolates data access and array manipulation from the Express routes.

```ts
export class BookingRepository {
  private readonly bookings: Booking[] = [
    // initial data
  ];
}
```

`private` means routes cannot directly manipulate the array. They must use repository methods.

- `findAll()` returns every booking.
- `findById(id)` uses `find()` to retrieve one booking.
- `create(booking)` uses `push()` to add a booking.
- `update(id, data)` uses `findIndex()` and replaces the item at that index.
- `delete(id)` uses `findIndex()` and `splice()` to remove one item.

For example:

```ts
const bookingIndex = this.bookings.findIndex(
  (booking) => booking.id === id,
);

if (bookingIndex === -1) {
  return undefined;
}

this.bookings[bookingIndex] = {
  ...this.bookings[bookingIndex],
  ...data,
  id,
};
```

The route is then responsible only for HTTP concerns:

```ts
const booking = bookingRepository.findById(req.params.id);

if (!booking) {
  res.status(404).json({ error: "Booking not found" });
  return;
}

res.status(200).json(booking);
```

This separation makes the code easier to test and prepares the application for replacing the in-memory array with MySQL later, without rewriting the route handlers.

## Understand how to enforce domain business validation rules independently of our routing framework.

I’ll use the current `BookingService` as the example and explain how its validation stays independent from Express routes and the repository.

Read 

Business validation belongs in `BookingService`, not inside the Express route.

```ts
create(booking: Booking): Booking {
  if (booking.desk.length < 3) {
    throw new Error("Desk name must be at least 3 characters long");
  }

  return this.bookingRepository.create(booking);
}
```

The layers have separate responsibilities:

- **Route/controller:** reads HTTP data and sends HTTP responses.
- **Service:** applies business rules.
- **Repository:** stores and retrieves data.

A route calls the service:

```ts
try {
  const booking = bookingService.create(req.body);
  res.status(201).json(booking);
} catch (error) {
  res.status(400).json({
    error: error instanceof Error ? error.message : "Invalid booking",
  });
}
```

The service does not know that Express exists. It can therefore be called from:

- An Express route
- A unit test
- A command-line script
- A future background job

This keeps the rule consistent. Any caller that tries to create a booking with a desk name shorter than three characters receives the same validation failure before the repository changes the stored array.

## Master the extraction of HTTP payloads and dynamic parameters, mapping service results back to clean JSON responses.

The controller translates HTTP input into service calls, then translates service results into HTTP responses.

### Dynamic route parameters

For:

```ts
GET /bookings/2
```

Express provides the path value through `req.params`:

```ts
getById = (req: Request<{ id: string }>, res: Response): void => {
  const booking = this.bookingService.findById(req.params.id);

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.status(200).json(booking);
};
```

`Request<{ id: string }>` documents that the route contains an `id` parameter, and `req.params.id` is passed to the service.

### Request payloads

For a JSON request body:

```ts
POST /bookings
```

the payload is extracted from `req.body`:

```ts
create = (
  req: Request<Record<string, never>, Booking, Booking>,
  res: Response,
): void => {
  try {
    const booking = this.bookingService.create(req.body);
    res.status(201).json(booking);
  } catch (error: unknown) {
    res.status(400).json({
      error: this.getErrorMessage(error),
    });
  }
};
```

The request type specifies that the body must match `Booking`.

### Mapping results to responses

The controller maps service outcomes to HTTP statuses:

- Successful result: `200` or `201`
- Missing result (`undefined`): `404`
- Service validation error: `400`
- Successful deletion: `204 No Content`

The service does not know about Express, HTTP, or JSON. It returns domain values or throws business errors; the controller turns those outcomes into clean API responses.

## Understand how routing acts as a thin routing-table layout that directs traffic without executing any business rules.

Routing should only connect an HTTP method and path to the correct controller method.

In `booking.routes.ts`:

```ts
router.get("/", bookingController.getAll);
router.get("/:id", bookingController.getById);
router.post("/", bookingController.create);
router.put("/:id", bookingController.update);
router.patch("/:id", bookingController.patch);
router.delete("/:id", bookingController.delete);
```

The route layer answers:

> Which controller handles this request?

It should not:

- Search the bookings array
- Validate desk names
- Modify booking state
- Build business-specific responses
- Decide how a booking is created or deleted

The request flow is:

```text
HTTP request
  -> router matches method and path
  -> controller receives req and res
  -> service applies business rules
  -> repository reads or changes data
  -> controller sends HTTP response
```

This separation keeps routing declarative and easy to scan. Business behavior belongs in the controller, service, or repository layer, while the route file remains a clear traffic map.

# Mastery (Manual Feedback & Correction Loop) notes

## Possible Issue: AI frequently passes req or res directly to service functions (e.g., bookingService.create(req)), meaning your service is locked to Express and cannot be used in a CLI script, desktop app, or message queue runner.

booking.service.ts already meets the requirement:

- Zero Express imports
- No Request or Response types
- Accepts only strings, Booking, and Partial<Booking>
- Returns Booking[], Booking, or undefined
- Business validation remains inside the service

The controller extracts HTTP data before calling the service, so the service can be reused by a CLI, desktop app, or message queue worker.

Confirmed with: npx tsc --noEmit
and a source search found no Express or HTTP references in services.

## Potentinal issue: AI often returns internal database errors directly to controllers, or forces the repository to know about HTTP statuses like 404.

The repository already follows the required separation:

- BookingRepository contains no HTTP status codes or Express imports.
- Missing resources return undefined.
- BookingService passes that result through.
- BookingController decides when to return:

```res.status(404).json({ error: "Booking not found" });```

TypeScript validation passed, and the repository HTTP-independence check found no status or Express references.

## Potential issue: In JavaScript/TypeScript, when passing a class method as a callback (e.g., router.get('/', bookingController.getAll)), the method loses its original class instance reference (this), leading to runtime crashes.

Updated booking.routes.ts to use wrapper arrow functions:

```ts
router.get("/", (req, res) => bookingController.getAll(req, res));
router.get("/:id", (req, res) => bookingController.getById(req, res));
router.post("/", (req, res) => bookingController.create(req, res));
router.put("/:id", (req, res) => bookingController.update(req, res));
router.patch("/:id", (req, res) => bookingController.patch(req, res));
router.delete("/:id", (req, res) => bookingController.delete(req, res));
```

This preserves the bookingController instance context.

## AI often instantiates duplicate database repositories across multiple services, causing memory leaks and split state caches.

The instantiation chain is already correct:

```text
booking.routes.ts
  -> new BookingController()
      -> new BookingService()
          -> new BookingRepository()
```

Specifically:

- `booking.routes.ts` creates the controller once.
- `booking.controller.ts` owns the service instance.
- `booking.service.ts` owns the repository instance.
- No duplicate repositories are created elsewhere.

TypeScript validation passed, and the search found only these three expected constructor calls.