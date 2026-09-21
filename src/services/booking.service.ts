import {
	Booking,
	BookingRepository,
} from "../repositories/booking.repository";

export class BookingService {
	constructor(private readonly bookingRepository: BookingRepository = new BookingRepository()) {}

	findAll(): Booking[] {
		return this.bookingRepository.findAll();
	}

	findById(id: string): Booking | undefined {
		return this.bookingRepository.findById(id);
	}

	create(booking: Booking): Booking {
		if (booking.desk.length < 3) {
			throw new Error("Desk name must be at least 3 characters long");
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
