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

	// Get a paginated list of bookings with metadata about the pagination
	getPaginatedShifts(page: number, limit: number): {
		data: Booking[];
		meta: {
			totalItems: number;
			itemsPerPage: number;
			currentPage: number;
			totalPages: number;
		};
	} {
		// Calculate the total number of bookings and the number of bookings to skip based on the current page and limit
		const totalItems = this.bookingRepository.count();
		// Determine how many bookings to skip based on the current page and limit
		const skip = (page - 1) * limit;
		// Retrieve the paginated list of bookings from the repository
		const data = this.bookingRepository.findPaginated(skip, limit);
		// Calculate the total number of pages based on the total items and the limit per page
		const totalPages = Math.ceil(totalItems / limit);

		// Return the paginated list of bookings along with the pagination metadata
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
