import { z } from "zod";

// Schema for validating authentication-related input (registration and login)
const passwordSchema = z
	.string()
	.min(8)
	.refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
		message: "Password must not exceed 72 bytes",
	});

// Schema for validating user registration input
export const registerSchema = z.object({
	first_name: z.string().trim().min(1).max(100),
	last_name: z.string().trim().min(1).max(100),
	email: z.string().trim().email().max(191),
	password: passwordSchema,
	team_id: z.number().int().positive().nullable().optional(),
});

// Schema for validating user login input
export const loginSchema = z.object({
	email: z.string().trim().email().max(191),
	password: z.string().min(1),
});

// Types for the input of registration and login routes
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;