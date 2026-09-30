import { Prisma, type Booking as PrismaBooking } from "../generated/prisma/client";
import { CreateBookingInput, UpdateBookingInput } from "../schemas/booking.schema";
import { prisma } from "../utils/prisma";

export class BookingRepository {
	findAll(): Promise<PrismaBooking[]> {
		return prisma.booking.findMany({
			orderBy: [{ booking_date: "asc" }, { id: "asc" }],
		});
	}

	findById(id: number): Promise<PrismaBooking | null> {
		return prisma.booking.findUnique({ where: { id } });
	}

	findPaginated(skip: number, limit: number): Promise<PrismaBooking[]> {
		return prisma.booking.findMany({
			skip,
			take: limit,
			orderBy: [{ booking_date: "asc" }, { id: "asc" }],
		});
	}

	count(): Promise<number> {
		return prisma.booking.count();
	}

	create(data: CreateBookingInput): Promise<PrismaBooking> {
		return prisma.booking.create({
			data: {
				user_id: data.user_id,
				desk_id: data.desk_id,
				booking_date: new Date(`${data.booking_date}T00:00:00.000Z`),
				active: data.active ?? true,
			},
		});
	}

	async update(id: number, data: UpdateBookingInput): Promise<PrismaBooking | undefined> {
		try {
			return await prisma.booking.update({
				where: { id },
				data: {
					...(data.user_id !== undefined && { user_id: data.user_id }),
					...(data.desk_id !== undefined && { desk_id: data.desk_id }),
					...(data.booking_date !== undefined && {
						booking_date: new Date(`${data.booking_date}T00:00:00.000Z`),
					}),
					...(data.active !== undefined && { active: data.active }),
				},
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return undefined;
			}
			throw error;
		}
	}

	async delete(id: number): Promise<PrismaBooking | undefined> {
		try {
			return await prisma.booking.delete({ where: { id } });
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return undefined;
			}
			throw error;
		}
	}
}
