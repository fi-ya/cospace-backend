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
