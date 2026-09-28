import { NextFunction, Request, Response, Router } from "express";
import {
	Booking,
	CreateBookingInput,
	createBookingSchema,
	UpdateBookingInput,
	updateBookingSchema,
} from "../schemas/booking.schema";
import { BookingController } from "../controllers/booking.controller";
import { requireAuth } from "../middleware/requireAuth";
import { validateSchema } from "../middleware/validate";

const router = Router();
const bookingController = new BookingController();

router.get("/", (req, res, next) => bookingController.getAll(req, res, next));
router.get("/:id", (req, res, next) =>
	bookingController.getById(req, res, next),
);
router.post(
	"/",
	requireAuth,
	validateSchema(createBookingSchema),
	(req: Request<Record<string, never>, Booking, CreateBookingInput>, res: Response, next: NextFunction) => bookingController.create(req, res, next),
);
router.put(
	"/:id",
	requireAuth,
	validateSchema(updateBookingSchema),
	(req: Request<{ id: string }, Booking, UpdateBookingInput>, res: Response, next: NextFunction) => bookingController.update(req, res, next),
);
router.patch(
	"/:id",
	requireAuth,
	(req: Request<{ id: string }>, res: Response, next: NextFunction) =>
		bookingController.patch(req, res, next),
);
router.delete(
	"/:id",
	requireAuth,
	(req: Request<{ id: string }>, res: Response, next: NextFunction) =>
		bookingController.delete(req, res, next),
);

export default router;
