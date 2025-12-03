import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import adminHrAndLoggedUser from "../middlewares/adminAndHr.middleware.js";
import {
  createHoliday,
  deleteHoliday,
  updateHoliday,
} from "../controllers/holiday.controller.js";

const holidayRouter = express.Router();

///// Static Routes /////
holidayRouter.post(
  "/holiday",
  authMiddleware,
  adminHrAndLoggedUser,
  createHoliday
);
holidayRouter.get("/holiday", authMiddleware);

///// Dynamic Routes /////
holidayRouter.put(
  "/holiday/:id",
  authMiddleware,
  adminHrAndLoggedUser,
  updateHoliday
);
holidayRouter.delete(
  "/holiday/:id",
  authMiddleware,
  adminHrAndLoggedUser,
  deleteHoliday
);

export default holidayRouter;
