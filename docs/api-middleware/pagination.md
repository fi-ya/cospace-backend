# Pagination

Tested against 6 bookings in the in-memory store (`Desk-01` through `Desk-06`).

## Page 1 vs Page 2, No Repeated Records

```bash
curl -sS 'http://localhost:5000/bookings?page=1&limit=3'
```

```json
{"data":[{"id":"1","desk":"Desk-01","floor":"Floor 1","date":"2026-09-21","active":true},{"id":"2","desk":"Desk-02","floor":"Floor 1","date":"2026-09-22","active":true},{"id":"3","desk":"Desk-03","floor":"Floor 2","date":"2026-09-23","active":false}],"meta":{"totalItems":6,"itemsPerPage":3,"currentPage":1,"totalPages":2}}
```

```bash
curl -sS 'http://localhost:5000/bookings?page=2&limit=3'
```

```json
{"data":[{"desk":"Desk-04","floor":"Floor 1","date":"2026-09-24","active":true},{"desk":"Desk-05","floor":"Floor 1","date":"2026-09-25","active":true},{"desk":"Desk-06","floor":"Floor 1","date":"2026-09-26","active":true}],"meta":{"totalItems":6,"itemsPerPage":3,"currentPage":2,"totalPages":2}}
```

Page 1 returns `Desk-01`, `Desk-02`, `Desk-03`. Page 2 returns `Desk-04`, `Desk-05`, `Desk-06`. No desk appears on both pages.

## Invalid and Excessive Query Parameters

```bash
curl -sS 'http://localhost:5000/bookings?page=abc'
```

```json
{"meta":{"totalItems":6,"itemsPerPage":10,"currentPage":1,"totalPages":1}}
```

`page=abc` fails `parseInt`, so it's clamped to the default `currentPage: 1`.

```bash
curl -sS 'http://localhost:5000/bookings?limit=999999'
```

```json
{"meta":{"totalItems":6,"itemsPerPage":50,"currentPage":1,"totalPages":1}}
```

`limit=999999` is clamped down to the enforced ceiling of `itemsPerPage: 50`, regardless of how large the client requested.

## Total Pages Formula

```ts
const totalPages = Math.ceil(totalItems / limit);
```

With 6 bookings and `limit=3`: `6 / 3 = 2` exactly, giving `totalPages: 2`, as shown above.

Rounding up matters for the general case. With, for example, 21 bookings and `limit=10`: `21 / 10 = 2.1`. Without rounding up, `Math.floor` or plain integer division would report `2` total pages, silently dropping the 11 leftover bookings on an unreported page 3. `Math.ceil(2.1)` correctly reports `3`, because a partial page still counts as a real page that a client needs to be able to request.
