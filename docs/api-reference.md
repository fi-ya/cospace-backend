# CoSpace API Reference

## Base URL

When running locally, the API base URL is `http://localhost:5000`. Routes are not prefixed with `/api`.

Requests with a body use JSON. Booking dates use the `YYYY-MM-DD` format.

## Routes

| Method | Path | Auth required | Success |
|---|---|---|---|
| `GET` | `/` | No | `200 OK` |
| `GET` | `/bookings` | No | `200 OK` |
| `GET` | `/bookings/:id` | No | `200 OK` |
| `POST` | `/bookings` | Yes | `201 Created` |
| `PUT` | `/bookings/:id` | Yes | `200 OK` |
| `PATCH` | `/bookings/:id` | Yes | `200 OK` |
| `DELETE` | `/bookings/:id` | Yes | `204 No Content` |
| `GET` | `/boom-app-error` | No | `404 Not Found` (diagnostic) |
| `GET` | `/boom-unexpected` | No | `500 Internal Server Error` (diagnostic) |

### Authentication

The booking create, update, toggle, and delete routes use the current `auth` middleware. It expects the `Authorization` header to be exactly `super-secret-key`:

```http
Authorization: super-secret-key
```

This implementation does not currently accept the documented project-wide `Bearer <token>` format. The value is a development-only hard-coded token, not production authentication.

### `GET /`

Returns API health information.

Response `200`:

```json
{
  "status": "active",
  "message": "CoSpace API is running"
}
```

### `GET /bookings`

Returns bookings ordered by booking date and then ID. Results are paginated.

| Query parameter | Default | Behavior |
|---|---:|---|
| `page` | `1` | Values below 1 are treated as 1; invalid values use the default. |
| `limit` | `10` | Clamped to a minimum of 1 and maximum of 50; invalid values use the default. |

Example request:

```http
GET /bookings?page=2&limit=10
```

Response `200`:

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 12,
      "desk_id": 4,
      "booking_date": "2026-10-12",
      "active": true
    }
  ],
  "meta": {
    "totalItems": 11,
    "itemsPerPage": 10,
    "currentPage": 2,
    "totalPages": 2
  }
}
```

An empty database returns `"data": []` and `"totalItems": 0`.

### `GET /bookings/:id`

Returns a booking by its positive integer ID.

Example request: `GET /bookings/1`

Response `200`:

```json
{
  "id": 1,
  "user_id": 12,
  "desk_id": 4,
  "booking_date": "2026-10-12",
  "active": true
}
```

Invalid IDs return `400`; a valid ID with no matching booking returns `404`.

### `POST /bookings`

Creates a booking. Requires the authorization header shown above.

Request body:

```json
{
  "user_id": 12,
  "desk_id": 4,
  "booking_date": "2026-10-12",
  "active": true
}
```

`user_id` and `desk_id` must be positive integers, and `booking_date` must be a valid calendar date in `YYYY-MM-DD` format. `active` is optional and defaults to `true`.

Response `201` returns the created booking in the same shape as `GET /bookings/:id`.

### `PUT /bookings/:id`

Updates the supplied fields on an existing booking. Despite the `PUT` method, the current validation schema permits partial updates. Requires authorization.

Request body (all fields are optional; supplied fields follow the create-booking types):

```json
{
  "booking_date": "2026-10-13",
  "active": false
}
```

Response `200` returns the updated booking. Invalid IDs or field values return `400`; a missing booking returns `404`.

### `PATCH /bookings/:id`

Toggles the booking's `active` value between `true` and `false`. Requires authorization. The current implementation does not read a request body, so omit it.

Example request: `PATCH /bookings/1`

Response `200` returns the updated booking. Invalid IDs return `400`; a missing booking returns `404`.

### `DELETE /bookings/:id`

Deletes a booking by positive integer ID. Requires authorization.

Example request: `DELETE /bookings/1`

Response `204` has no response body. Invalid IDs return `400`; a missing booking returns `404`.

## Errors

Errors handled by the API use this JSON shape:

```json
{
  "status": "fail",
  "message": "Booking not found",
  "errors": []
}
```

Validation errors use `400` and include field-level details in `errors`:

```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "booking_date",
      "message": "Invalid date"
    }
  ]
}
```

Malformed JSON returns `400`. Missing or invalid authorization returns `401`. Unhandled server errors return `500` with a generic message. Database constraint errors are not currently mapped to a dedicated client status and may return `500`.

## Diagnostic Routes

These routes exist to exercise error handling and are not business endpoints:

- `GET /boom-app-error` returns `404` with message `Test resource not found`.
- `GET /boom-unexpected` returns `500` with message `Something went wrong on our end`.

## Not Currently Mounted

`src/routes/auth.routes.ts` declares `POST /register` and `POST /login`, but the router is not mounted in `src/index.ts`. Those endpoints are currently unavailable, so this reference does not define request or response payloads for them.