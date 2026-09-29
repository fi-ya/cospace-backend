import { NextFunction, Request, Response, Router } from "express";
import type { Booking as PrismaBooking } from "../generated/prisma/client";
import {
	CreateBookingInput,
	UpdateBookingInput,
	createBookingSchema,
	updateBookingSchema,
} from "../schemas/booking.schema";
import { BookingController } from "../controllers/booking.controller";
import { auth } from "../middleware/auth";
import { validateSchema } from "../middleware/validate";

const router = Router();
const bookingController = new BookingController();

router.get("/", (req, res, next) => bookingController.getAll(req, res, next));
router.get("/:id", (req, res, next) =>
	bookingController.getById(req, res, next),
);
router.post(
	"/",
	auth,
	validateSchema(createBookingSchema),
	(
		req: Request<Record<string, never>, PrismaBooking, CreateBookingInput>,
		res: Response,
		next: NextFunction,
	) => bookingController.create(req, res, next),
);
router.put(
	"/:id",
	auth,
	validateSchema(updateBookingSchema),
	(
		req: Request<{ id: string }, PrismaBooking, UpdateBookingInput>,
		res: Response,
		next: NextFunction,
	) => bookingController.update(req, res, next),
);
router.patch(
	"/:id",
	auth,
	(req: Request<{ id: string }>, res: Response, next: NextFunction) =>
		bookingController.patch(req, res, next),
);
router.delete(
	"/:id",
	auth,
	(req: Request<{ id: string }>, res: Response, next: NextFunction) =>
		bookingController.delete(req, res, next),
);

export default router;
