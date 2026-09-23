import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus";
import { NotFoundError } from "../errors/notFoundError";
import { Booking } from "../schemas/booking.schema";
import { BookingService } from "../services/booking.service";

export class BookingController {
	constructor(
		private readonly bookingService: BookingService = new BookingService(),
	) {}

	private parseIntWithDefault(value: unknown, defaultValue: number): number {
		const parsed = parseInt(String(value), 10);
		return Number.isNaN(parsed) ? defaultValue : parsed;
	}

	getAll = (req: Request, res: Response, _next: NextFunction): void => {
		// ensure page is at least 1
		const page = Math.max(this.parseIntWithDefault(req.query.page, 1), 1);

		// ensure limit is at least 1 and at most 50 - default page size (10) and max (50), per project conventions
		const limit = Math.min(
			Math.max(this.parseIntWithDefault(req.query.limit, 10), 1),
			50,
		);

		const result = this.bookingService.getPaginatedShifts(page, limit);
		res.status(HttpStatus.OK).json(result);
	};

	getById = (
		req: Request<{ id: string }>,
		res: Response,
		next: NextFunction,
	): void => {
		const booking = this.bookingService.findById(req.params.id);

		if (!booking) {
			next(new NotFoundError("Booking not found"));
			return;
		}

		res.status(HttpStatus.OK).json(booking);
	};

	create = (
		req: Request<Record<string, never>, Booking, Booking>,
		res: Response,
		next: NextFunction,
	): void => {
		try {
			const booking = this.bookingService.create(req.body);
			res.status(HttpStatus.CREATED).json(booking);
		} catch (error: unknown) {
			next(error);
		}
	};

	update = (
		req: Request<{ id: string }, Booking, Partial<Booking>>,
		res: Response,
		next: NextFunction,
	): void => {
		try {
			const booking = this.bookingService.update(req.params.id, req.body);

			if (!booking) {
				next(new NotFoundError("Booking not found"));
				return;
			}

			res.status(HttpStatus.OK).json(booking);
		} catch (error: unknown) {
			next(error);
		}
	};

	patch = (
		req: Request<{ id: string }>,
		res: Response,
		next: NextFunction,
	): void => {
		const booking = this.bookingService.findById(req.params.id);

		if (!booking) {
			next(new NotFoundError("Booking not found"));
			return;
		}

		const updatedBooking = this.bookingService.update(req.params.id, {
			active: !booking.active,
		});
		res.status(HttpStatus.OK).json(updatedBooking);
	};

	delete = (
		req: Request<{ id: string }>,
		res: Response,
		next: NextFunction,
	): void => {
		const booking = this.bookingService.delete(req.params.id);

		if (!booking) {
			next(new NotFoundError("Booking not found"));
			return;
		}

		res.status(HttpStatus.NO_CONTENT).send();
	};
}
