import { Request, Response, Router } from "express";
import { Booking, createBookingSchema } from "../schemas/booking.schema";
import { BookingController } from "../controllers/booking.controller";
import { auth } from "../middleware/auth";
import { validateSchema } from "../middleware/validate";

const router = Router();
const bookingController = new BookingController();

router.get("/", (req, res) => bookingController.getAll(req, res));
router.get("/:id", (req, res) => bookingController.getById(req, res));
router.post(
	"/",
	auth,
	validateSchema(createBookingSchema),
	(req: Request<Record<string, never>, Booking, Booking>, res: Response) =>
		bookingController.create(req, res),
);
router.put(
	"/:id",
	auth,
	(req: Request<{ id: string }, Booking, Booking>, res: Response) =>
		bookingController.update(req, res),
);
router.patch(
	"/:id",
	auth,
	(req: Request<{ id: string }>, res: Response) =>
		bookingController.patch(req, res),
);
router.delete(
	"/:id",
	auth,
	(req: Request<{ id: string }>, res: Response) =>
		bookingController.delete(req, res),
);

export default router;
