import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";

const router = Router();
const bookingController = new BookingController();

router.get("/", bookingController.getAll);
router.get("/:id", bookingController.getById);
router.post("/", bookingController.create);
router.put("/:id", bookingController.update);
router.patch("/:id", bookingController.patch);
router.delete("/:id", bookingController.delete);

export default router;
