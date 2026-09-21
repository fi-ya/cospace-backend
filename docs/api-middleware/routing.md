# CoSpace Booking Routes

The booking router is mounted in `src/index.ts` at `/bookings`. The router itself is defined in `src/routes/bookings.ts`.

## Route Planning

| Method | Path | Payload | Success status |
|---|---|---|---:|
| `GET` | `/bookings` | None | `200` |
| `GET` | `/bookings/:id` | None; the booking ID is read from `req.params.id` | `200` |
| `POST` | `/bookings` | Complete `Booking` JSON object in `req.body` | `201` |
| `PUT` | `/bookings/:id` | Complete replacement `Booking` JSON object in `req.body` | `200` |
| `PATCH` | `/bookings/:id` | None; the route flips only the `active` field | `200` |
| `DELETE` | `/bookings/:id` | None; the booking ID is read from `req.params.id` | `204` |

All routes use string booking IDs. A missing booking returns `404` with `{ "error": "Booking not found" }` for the lookup and mutation routes.

## Successful POST

Command:

```bash
curl -sS -X POST http://localhost:5000/bookings -H 'Content-Type: application/json' -d '{"id":"4","desk":"Desk-04","floor":2,"date":"2026-09-24","active":true}' -w '\nHTTP status: %{http_code}\n'
```

Response:

```text
{"id":"4","desk":"Desk-04","floor":2,"date":"2026-09-24","active":true}
HTTP status: 201
```

## Booking Not Found

Command:

```bash
curl -sS http://localhost:5000/bookings/999 -w '\nHTTP status: %{http_code}\n'
```

Response:

```text
{"error":"Booking not found"}
HTTP status: 404
```

## JSON Request Bodies

Without `express.json()`, a JSON request's `req.body` is not parsed and is unavailable to the route handler; I found this by comparing the POST request behavior with and without `app.use(express.json())` enabled.
