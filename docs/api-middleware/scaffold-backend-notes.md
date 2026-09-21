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