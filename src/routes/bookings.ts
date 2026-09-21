import { Request, Response, Router } from "express";
import { Booking, BookingRepository } from "../repositories/booking.repository";

const router = Router();
const bookingRepository = new BookingRepository();

router.get("/", (_req: Request, res: Response) => {
	res.status(200).json(bookingRepository.findAll());
});

router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
	const booking = bookingRepository.findById(req.params.id);

	if (!booking) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	res.status(200).json(booking);
});

router.post(
	"/",
	(req: Request<Record<string, never>, Booking, Booking>, res: Response) => {
		const booking = bookingRepository.create(req.body);
		res.status(201).json(booking);
	},
);

router.put(
	"/:id",
	(req: Request<{ id: string }, Booking, Booking>, res: Response) => {
		const booking = bookingRepository.update(req.params.id, req.body);

		if (!booking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		res.status(200).json(booking);
	},
);

router.patch("/:id", (req: Request<{ id: string }>, res: Response) => {
	const booking = bookingRepository.findById(req.params.id);
	if (!booking) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	const updatedBooking = bookingRepository.update(req.params.id, {
		active: !booking.active,
	});
	res.status(200).json(updatedBooking);
});

router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
	const booking = bookingRepository.delete(req.params.id);

	if (!booking) {
		res.status(404).json({ error: "Booking not found" });
		return;
	}

	res.status(204).send();
});

export default router;
