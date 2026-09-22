import { z } from "zod";

export const createBookingSchema = z.object({
	desk: z.string().trim().min(3).max(100),
	floor: z.string().trim().min(5).max(200),
	date: z.string().date(),
	active: z.boolean().default(true),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
