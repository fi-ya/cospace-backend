import { z } from "zod";

export const createBookingSchema = z.object({
	desk_id: z.number().int().positive(),
	booking_date: z.string().date(),
	active: z.boolean().default(true),
});

export const bookingSchema = z.object({
	id: z.number().int().positive(),
	user_id: z.number().int().positive(),
	desk_id: z.number().int().positive(),
	booking_date: z.string().date(),
	active: z.boolean(),
});

export const updateBookingSchema = z.object({
	desk_id: z.number().int().positive().optional(),
	booking_date: z.string().date().optional(),
	active: z.boolean().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type Booking = z.infer<typeof bookingSchema>;
