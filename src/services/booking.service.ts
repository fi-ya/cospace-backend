import { BookingRepository } from "../repositories/booking.repository";
import type {
	Booking,
	CreateBookingInput,
	UpdateBookingInput,
} from "../schemas/booking.schema";

export class BookingService {
	constructor(private readonly bookingRepository: BookingRepository = new BookingRepository()) {}

	findAll(): Promise<Booking[]> {
		return this.bookingRepository.findAll();
	}

	findById(id: number): Promise<Booking | undefined> {
		return this.bookingRepository.findById(id);
	}

	async getPaginatedShifts(page: number, limit: number): Promise<{
		data: Booking[];
		meta: {
			totalItems: number;
			itemsPerPage: number;
			currentPage: number;
			totalPages: number;
		};
	}> {
		const skip = (page - 1) * limit;
		const [totalItems, data] = await Promise.all([
			this.bookingRepository.count(),
			this.bookingRepository.findPaginated(skip, limit),
		]);
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

	create(booking: CreateBookingInput): Promise<Booking> {
		return this.bookingRepository.create(booking);
	}

	update(id: number, data: UpdateBookingInput): Promise<Booking | undefined> {
		return this.bookingRepository.update(id, data);
	}

	delete(id: number): Promise<Booking | undefined> {
		return this.bookingRepository.delete(id);
	}
}
