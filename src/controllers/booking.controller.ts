import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus";
import { BadRequestError } from "../errors/badRequestError";
import { NotFoundError } from "../errors/notFoundError";
import type { Booking as PrismaBooking } from "../generated/prisma/client";
import { CreateBookingInput, UpdateBookingInput } from "../schemas/booking.schema";
import { BookingService } from "../services/booking.service";

export class BookingController {
	constructor(
		private readonly bookingService: BookingService = new BookingService(),
	) {}

	private parseIntWithDefault(value: unknown, defaultValue: number): number {
		const parsed = parseInt(String(value), 10);
		return Number.isNaN(parsed) ? defaultValue : parsed;
	}

	private parseBookingId(value: string): number {
		const id = Number(value);
		if (!Number.isInteger(id) || id < 1) {
			throw new BadRequestError("Booking id must be a positive integer");
		}
		return id;
	}

	getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		// ensure page is at least 1
		const page = Math.max(this.parseIntWithDefault(req.query.page, 1), 1);

		// ensure limit is at least 1 and at most 50 - default page size (10) and max (50), per project conventions
		const limit = Math.min(
			Math.max(this.parseIntWithDefault(req.query.limit, 10), 1),
			50,
		);

		try {
			const result = await this.bookingService.getPaginatedShifts(page, limit);
			res.status(HttpStatus.OK).json(result);
		} catch (error: unknown) {
			next(error);
		}
	};

	getById = async (
		req: Request<{ id: string }>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const booking = await this.bookingService.findById(
				this.parseBookingId(req.params.id),
			);

			if (!booking) {
				next(new NotFoundError("Booking not found"));
				return;
			}

			res.status(HttpStatus.OK).json(booking);
		} catch (error: unknown) {
			next(error);
		}
	};

	create = async (
		req: Request<Record<string, never>, PrismaBooking, CreateBookingInput>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const booking = await this.bookingService.create(req.body);
			res.status(HttpStatus.CREATED).json(booking);
		} catch (error: unknown) {
			next(error);
		}
	};

	update = async (
		req: Request<{ id: string }, PrismaBooking, UpdateBookingInput>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const booking = await this.bookingService.update(
				this.parseBookingId(req.params.id),
				req.body,
			);

			if (!booking) {
				next(new NotFoundError("Booking not found"));
				return;
			}

			res.status(HttpStatus.OK).json(booking);
		} catch (error: unknown) {
			next(error);
		}
	};

	patch = async (
		req: Request<{ id: string }>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const id = this.parseBookingId(req.params.id);
			const booking = await this.bookingService.findById(id);

			if (!booking) {
				next(new NotFoundError("Booking not found"));
				return;
			}

			const updatedBooking = await this.bookingService.update(id, {
				active: !booking.active,
			});
			res.status(HttpStatus.OK).json(updatedBooking);
		} catch (error: unknown) {
			next(error);
		}
	};

	delete = async (
		req: Request<{ id: string }>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const booking = await this.bookingService.delete(
				this.parseBookingId(req.params.id),
			);

			if (!booking) {
				next(new NotFoundError("Booking not found"));
				return;
			}

			res.status(HttpStatus.NO_CONTENT).send();
		} catch (error: unknown) {
			next(error);
		}
	};
}
