import { Request, Response } from "express";
import { Booking } from "../repositories/booking.repository";
import { BookingService } from "../services/booking.service";

export class BookingController {
	constructor(
		private readonly bookingService: BookingService = new BookingService(),
	) {}

	getAll = (_req: Request, res: Response): void => {
		res.status(200).json(this.bookingService.findAll());
	};

	getById = (req: Request<{ id: string }>, res: Response): void => {
		const booking = this.bookingService.findById(req.params.id);

		if (!booking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		res.status(200).json(booking);
	};

	create = (
		req: Request<Record<string, never>, Booking, Booking>,
		res: Response,
	): void => {
		try {
			const booking = this.bookingService.create(req.body);
			res.status(201).json(booking);
		} catch (error: unknown) {
			res.status(400).json({ error: this.getErrorMessage(error) });
		}
	};

	update = (
		req: Request<{ id: string }, Booking, Partial<Booking>>,
		res: Response,
	): void => {
		try {
			const booking = this.bookingService.update(req.params.id, req.body);

			if (!booking) {
				res.status(404).json({ error: "Booking not found" });
				return;
			}

			res.status(200).json(booking);
		} catch (error: unknown) {
			res.status(400).json({ error: this.getErrorMessage(error) });
		}
	};

	patch = (req: Request<{ id: string }>, res: Response): void => {
		const booking = this.bookingService.findById(req.params.id);

		if (!booking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		const updatedBooking = this.bookingService.update(req.params.id, {
			active: !booking.active,
		});
		res.status(200).json(updatedBooking);
	};

	delete = (req: Request<{ id: string }>, res: Response): void => {
		const booking = this.bookingService.delete(req.params.id);

		if (!booking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		res.status(204).send();
	};

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : "Invalid booking";
	}
}
