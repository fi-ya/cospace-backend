# CoSpace Architecture

The booking request flows through four layers:

```text
Router -> Controller -> Service -> Repository
```

## Four-Layer Request Trace

For a request such as `GET /bookings/2`, the layers have these responsibilities. The following console trace shows the order in which a diagnostic trace would appear:

```text
[router] GET /bookings/2
[controller] getById("2")
[service] findById("2")
[repository] findById("2")
[controller] response 200
```

The router only directs the request. The controller translates HTTP input and output. The service owns business rules. The repository reads or changes the in-memory booking array.

## Validation Error

A booking with a desk name shorter than three characters is rejected by `BookingService.create()` before the repository stores it.

Command:

```bash
curl -sS -X POST http://localhost:5000/bookings -H 'Content-Type: application/json' -d '{"id":"4","desk":"AB","floor":2,"date":"2026-09-24","active":true}' -w '\nHTTP status: %{http_code}\n'
```

Response:

```text
{"error":"Desk name must be at least 3 characters long"}
HTTP status: 400
```

The `400` response is produced by `BookingController.create()` after it catches the validation error thrown by `BookingService.create()`. The repository is never called for this invalid booking.

## Express Independence

The service layer must not import Express because business rules should be reusable by non-HTTP callers such as a CLI script, desktop application, or message-queue worker.

# Showcase

## Explain how data flows seamlessly down through the decoupled layers, and how each layer only communicates with the layer directly beneath it.

Data flows through the application in one controlled direction:

```text
HTTP request
  -> Router
  -> Controller
  -> Service
  -> Repository
  -> in-memory data
```

Each layer communicates only with the layer directly beneath it:

- **Router:** matches the HTTP method and path, then calls the controller.
- **Controller:** extracts `req.params` and `req.body`, then calls the service with plain TypeScript values.
- **Service:** applies business rules, such as validating the desk name, then calls the repository.
- **Repository:** searches or changes the in-memory booking array.

For a `POST /bookings` request:

```text
JSON payload
  -> router forwards request
  -> controller extracts req.body
  -> service validates Booking
  -> repository stores Booking
  -> service returns Booking
  -> controller sends HTTP 201 JSON response
```

The response travels back up through return values:

```text
Repository result
  -> Service result
  -> Controller HTTP response
  -> Client
```

This prevents layer coupling. The service does not know about Express, and the repository does not know about HTTP status codes. Replacing the in-memory repository with MySQL would not require rewriting the controller or route mapping.

## Explain that the validation error was thrown by the Service layer because of a business rule breach, and caught gracefully by the Controller to format the HTTP response.

The validation error originates in the **Service** layer because the booking violates a business rule:

```ts
if (booking.desk.length < 3) {
  throw new Error("Desk name must be at least 3 characters long");
}
```

The **Controller** calls the service and catches the error:

```ts
try {
  const booking = this.bookingService.create(req.body);
  res.status(201).json(booking);
} catch (error: unknown) {
  res.status(400).json({
    error: this.getErrorMessage(error),
  });
}
```

The service does not know about Express or HTTP status codes. It only enforces the domain rule and throws an error.

The controller translates that error into an HTTP response:

```http
400 Bad Request
```

```json
{
  "error": "Desk name must be at least 3 characters long"
}
```

This keeps business validation in the Service layer and HTTP formatting in the Controller layer.

## Explain why this structure makes it incredibly simple to swap out our in-memory data storage for a real database later, without having to change our routing or controller configurations at all.

The layers hide storage details behind stable method contracts.

Currently:

```text
Controller -> BookingService -> BookingRepository -> in-memory array
```

The controller calls methods such as:

```ts
bookingService.findById(id);
bookingService.create(booking);
```

The service calls repository methods:

```ts
bookingRepository.findById(id);
bookingRepository.create(booking);
```

The controller and routes do not know whether the repository uses an array, MySQL, or another database.

Later, the in-memory implementation can be replaced with a database-backed repository that exposes the same methods:

```ts
class DatabaseBookingRepository {
  findAll(): Promise<Booking[]> { /* query database */ }
  findById(id: string): Promise<Booking | undefined> { /* query database */ }
  create(booking: Booking): Promise<Booking> { /* insert row */ }
}
```

The service would receive the new repository, while the routes and controllers would continue using the same endpoint mappings and HTTP behavior.

This works because:

- **Routes** know only controller methods.
- **Controllers** know only HTTP and service methods.
- **Services** know business rules and repository methods.
- **Repositories** know storage details.

The public API stays stable while the persistence implementation changes underneath it.