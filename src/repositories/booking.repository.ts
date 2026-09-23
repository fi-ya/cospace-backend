import { Booking } from "../schemas/booking.schema";

export class BookingRepository {
	private readonly bookings: Booking[] = [
		{ id: "1", desk: "Desk-01", floor: "Floor 1", date: "2026-09-21", active: true },
		{ id: "2", desk: "Desk-02", floor: "Floor 1", date: "2026-09-22", active: true },
		{ id: "3", desk: "Desk-03", floor: "Floor 2", date: "2026-09-23", active: false },
	];

	findAll(): Booking[] {
		return this.bookings;
	}

	findById(id: string): Booking | undefined {
		return this.bookings.find((booking) => booking.id === id);
	}

	findPaginated(skip: number, limit: number): Booking[] {
		return this.bookings.slice(skip, skip + limit);
	}

	count(): number {
		return this.bookings.length;
	}

	create(booking: Booking): Booking {
		this.bookings.push(booking);
		return booking;
	}

	update(id: string, data: Partial<Booking>): Booking | undefined {
		const bookingIndex = this.bookings.findIndex(
			(booking) => booking.id === id,
		);

		if (bookingIndex === -1) {
			return undefined;
		}

		const booking = this.bookings[bookingIndex];
		if (!booking) {
			return undefined;
		}

		this.bookings[bookingIndex] = { ...booking, ...data, id };
		return this.bookings[bookingIndex];
	}

	delete(id: string): Booking | undefined {
		const bookingIndex = this.bookings.findIndex(
			(booking) => booking.id === id,
		);

		if (bookingIndex === -1) {
			return undefined;
		}

		return this.bookings.splice(bookingIndex, 1)[0];
	}
}
