import express, { Request, Response } from "express";

interface Booking {
  id: number;
  desk: string;
  floor: number;
  date: string;
  active: boolean;
}

export const bookings: Booking[] = [
  { id: 1, desk: "Desk-01", floor: 1, date: "2026-09-21", active: true },
  { id: 2, desk: "Desk-02", floor: 1, date: "2026-09-22", active: true },
  { id: 3, desk: "Desk-03", floor: 2, date: "2026-09-23", active: false },
];

const app = express();
const port = 5000;

app.use(express.json());

// Define the root route for the API
app.get("/", (req: Request, res: Response) => {
	res.status(200).json({
		status: "active",
		message: "CoSpace API is running",
	});
});

app.get("/bookings", (_req: Request, res: Response) => {
  res.status(200).json(bookings);
});

app.get(
  "/bookings/:id",
  (req: Request<{ id: string }>, res: Response) => {
    const bookingId = Number(req.params.id);
    const booking = bookings.find(({ id }) => id === bookingId);

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.status(200).json(booking);
  },
);

app.post(
  "/bookings",
  (req: Request<Record<string, never>, Booking, Booking>, res: Response) => {
    bookings.push(req.body);
    res.status(201).json(req.body);
  },
);

app.put(
  "/bookings/:id",
  (req: Request<{ id: string }, Booking, Booking>, res: Response) => {
    const bookingIndex = bookings.findIndex(
      ({ id }) => id === Number(req.params.id),
    );

    if (bookingIndex === -1) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    bookings[bookingIndex] = req.body;
    res.status(200).json(req.body);
  },
);

app.patch(
  "/bookings/:id",
  (req: Request<{ id: string }>, res: Response) => {
    const booking = bookings.find(({ id }) => id === Number(req.params.id));

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    booking.active = !booking.active;
    res.status(200).json(booking);
  },
);

app.delete(
  "/bookings/:id",
  (req: Request<{ id: string }>, res: Response) => {
    const bookingIndex = bookings.findIndex(
      ({ id }) => id === Number(req.params.id),
    );

    if (bookingIndex === -1) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    const [deletedBooking] = bookings.splice(bookingIndex, 1);
    res.status(200).json(deletedBooking);
  },
);

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received: closing HTTP server`);

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
