export interface Booking {
	id: string;
	desk: string;
	floor: number;
	date: string;
	active: boolean;
}

export class BookingRepository {
	private readonly bookings: Booking[] = [
		{ id: "1", desk: "Desk-01", floor: 1, date: "2026-09-21", active: true },
		{ id: "2", desk: "Desk-02", floor: 1, date: "2026-09-22", active: true },
		{ id: "3", desk: "Desk-03", floor: 2, date: "2026-09-23", active: false },
	];

	findAll(): Booking[] {
		return this.bookings;
	}

	findById(id: string): Booking | undefined {
		return this.bookings.find((booking) => booking.id === id);
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
