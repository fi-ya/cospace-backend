import { Prisma, type Booking as PrismaBooking } from "../generated/prisma/client";
import type {
	Booking,
	CreateBookingInput,
	UpdateBookingInput,
} from "../schemas/booking.schema";
import { prisma } from "../utils/prisma";

function toApiBooking(booking: PrismaBooking): Booking {
	return {
		id: booking.id,
		user_id: booking.user_id,
		desk_id: booking.desk_id,
		booking_date: booking.booking_date.toISOString().slice(0, 10),
		active: booking.active,
	};
}

function isRecordNotFound(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === "P2025"
	);
}

export class BookingRepository {
	async findAll(): Promise<Booking[]> {
		const bookings = await prisma.booking.findMany({
			orderBy: [{ booking_date: "asc" }, { id: "asc" }],
		});
		return bookings.map(toApiBooking);
	}

	async findById(id: number): Promise<Booking | undefined> {
		const booking = await prisma.booking.findUnique({ where: { id } });
		return booking ? toApiBooking(booking) : undefined;
	}

	async findPaginated(skip: number, limit: number): Promise<Booking[]> {
		const bookings = await prisma.booking.findMany({
			skip,
			take: limit,
			orderBy: [{ booking_date: "asc" }, { id: "asc" }],
		});
		return bookings.map(toApiBooking);
	}

	count(): Promise<number> {
		return prisma.booking.count();
	}

	async create(data: CreateBookingInput, userId: number): Promise<Booking> {
		const booking = await prisma.booking.create({
			data: {
				user: { connect: { id: userId } },
				desk: { connect: { id: data.desk_id } },
				booking_date: new Date(`${data.booking_date}T00:00:00.000Z`),
				active: data.active,
			},
		});
		return toApiBooking(booking);
	}

	async update(
		id: number,
		data: UpdateBookingInput,
	): Promise<Booking | undefined> {
		const updateData: Prisma.BookingUncheckedUpdateInput = {
			...(data.desk_id !== undefined && { desk_id: data.desk_id }),
			...(data.booking_date !== undefined && {
				booking_date: new Date(`${data.booking_date}T00:00:00.000Z`),
			}),
			...(data.active !== undefined && { active: data.active }),
		};

		try {
			const booking = await prisma.booking.update({ where: { id }, data: updateData });
			return toApiBooking(booking);
		} catch (error: unknown) {
			if (isRecordNotFound(error)) {
				return undefined;
			}
			throw error;
		}
	}

	async delete(id: number): Promise<Booking | undefined> {
		try {
			const booking = await prisma.booking.delete({ where: { id } });
			return toApiBooking(booking);
		} catch (error: unknown) {
			if (isRecordNotFound(error)) {
				return undefined;
			}
			throw error;
		}
	}
}
