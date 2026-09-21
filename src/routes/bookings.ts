import { Request, Response, Router } from "express";

export interface Booking {
	id: string;
	desk: string;
	floor: number;
	date: string;
	active: boolean;
}

export const bookings: Booking[] = [
	{ id: "1", desk: "Desk-01", floor: 1, date: "2026-09-21", active: true },
	{ id: "2", desk: "Desk-02", floor: 1, date: "2026-09-22", active: true },
	{ id: "3", desk: "Desk-03", floor: 2, date: "2026-09-23", active: false },
];

const router = Router();

router.get("/", (_req: Request, res: Response) => {
	res.status(200).json(bookings);
});

router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
	const bookingId = req.params.id;
	const booking = bookings.find(({ id }) => id === bookingId);

	if (!booking) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	res.status(200).json(booking);
});

router.post(
	"/",
	(req: Request<Record<string, never>, Booking, Booking>, res: Response) => {
		bookings.push(req.body);
		res.status(201).json(req.body);
	},
);

router.put(
	"/:id",
	(req: Request<{ id: string }, Booking, Booking>, res: Response) => {
		const bookingIndex = bookings.findIndex(
			({ id }) => id === req.params.id,
		);

		if (bookingIndex === -1) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		bookings[bookingIndex] = req.body;
		res.status(200).json(req.body);
	},
);

router.patch("/:id", (req: Request<{ id: string }>, res: Response) => {
	const bookingIndex = bookings.findIndex(
		({ id }) => id === req.params.id,
	);

	if (bookingIndex === -1) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	const booking = bookings[bookingIndex];
	if (!booking) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	bookings[bookingIndex] = { ...booking, active: !booking.active };
	res.status(200).json(bookings[bookingIndex]);
});

router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
	const bookingIndex = bookings.findIndex(
		({ id }) => id === req.params.id,
	);

	if (bookingIndex === -1) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	bookings.splice(bookingIndex, 1);
	res.status(204).send();
});

export default router;
