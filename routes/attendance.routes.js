import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import {
  attendanceToggle,
  getAttendanceForAllEmployees,
} from "../controllers/attendance.controller.js";
import adminHrAndLoggedUser from "../middlewares/adminAndHr.middleware.js";

const attendanceRouter = express.Router();

attendanceRouter.post("/attendance/toggle", authMiddleware, attendanceToggle);
attendanceRouter.get(
  "/attendance/today",
  authMiddleware,
  adminHrAndLoggedUser,
  getAttendanceForAllEmployees
);

export default attendanceRouter;
