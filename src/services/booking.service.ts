import { BookingRepository } from "../repositories/booking.repository";
import { BadRequestError } from "../errors/badRequestError";
import { Booking } from "../schemas/booking.schema";

export class BookingService {
	constructor(private readonly bookingRepository: BookingRepository = new BookingRepository()) {}

	findAll(): Booking[] {
		return this.bookingRepository.findAll();
	}

	findById(id: string): Booking | undefined {
		return this.bookingRepository.findById(id);
	}

	getPaginatedShifts(page: number, limit: number): {
		data: Booking[];
		meta: {
			totalItems: number;
			itemsPerPage: number;
			currentPage: number;
			totalPages: number;
		};
	} {
		const totalItems = this.bookingRepository.count();
		const skip = (page - 1) * limit;
		const data = this.bookingRepository.findPaginated(skip, limit);
		const totalPages = Math.ceil(totalItems / limit);

		return {
			data,
			meta: {
				totalItems,
				itemsPerPage: limit,
				currentPage: page,
				totalPages,
			},
		};
	}

	create(booking: Booking): Booking {
		if (booking.desk.length < 3) {
			throw new BadRequestError("Desk name must be at least 3 characters long");
		}

		return this.bookingRepository.create(booking);
	}

	update(id: string, data: Partial<Booking>): Booking | undefined {
		return this.bookingRepository.update(id, data);
	}

	delete(id: string): Booking | undefined {
		return this.bookingRepository.delete(id);
	}
}
