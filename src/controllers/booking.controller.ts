import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus";
import { NotFoundError } from "../errors/notFoundError";
import { Booking } from "../schemas/booking.schema";
import { BookingService } from "../services/booking.service";

export class BookingController {
	constructor(
		private readonly bookingService: BookingService = new BookingService(),
	) {}

	// Helper method to parse integers with a default value if parsing fails
	private parseIntWithDefault(value: unknown, defaultValue: number): number {
		// Convert the value to a string and attempt to parse it as an integer
		const parsed = parseInt(String(value), 10);
		
		// If parsing fails, return the default value
		return Number.isNaN(parsed) ? defaultValue : parsed;
	}

	// Get all bookings with pagination
	getAll = (req: Request, res: Response, _next: NextFunction): void => {
		// Parse the page query parameter and ensure it is at least 1
		const page = Math.max(this.parseIntWithDefault(req.query.page, 1), 1);

		// Parse the limit query parameter, ensuring it is at least 1 and at most 50
		const limit = Math.min(
			Math.max(this.parseIntWithDefault(req.query.limit, 10), 1),
			50,
		);

		// Retrieve the paginated list of bookings from the service
		const result = this.bookingService.getPaginatedShifts(page, limit);

		// Send the paginated list of bookings as the response
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
