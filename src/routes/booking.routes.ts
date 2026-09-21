import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";

const router = Router();
const bookingController = new BookingController();

router.get("/", (req, res) => bookingController.getAll(req, res));
router.get("/:id", (req, res) => bookingController.getById(req, res));
router.post("/", (req, res) => bookingController.create(req, res));
router.put("/:id", (req, res) => bookingController.update(req, res));
router.patch("/:id", (req, res) => bookingController.patch(req, res));
router.delete("/:id", (req, res) => bookingController.delete(req, res));

export default router;
