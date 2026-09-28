import { z } from "zod";

export const createBookingSchema = z.object({
	user_id: z.number().int().positive(),
	desk_id: z.number().int().positive(),
	booking_date: z.string().date(),
	active: z.boolean().default(true),
});

export const bookingSchema = createBookingSchema.extend({
	id: z.number().int().positive(),
});

export const updateBookingSchema = createBookingSchema.partial();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type Booking = z.infer<typeof bookingSchema>;
