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