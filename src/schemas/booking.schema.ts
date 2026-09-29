import { z } from "zod";

export const createBookingSchema = z.object({
	user_id: z.number().int().positive(),
	desk_id: z.number().int().positive(),
	booking_date: z.string().date(),
	active: z.boolean().default(true),
});

export const updateBookingSchema = createBookingSchema.partial();

export type CreateBookingInput = z.input<typeof createBookingSchema>;
export type UpdateBookingInput = z.input<typeof updateBookingSchema>;
