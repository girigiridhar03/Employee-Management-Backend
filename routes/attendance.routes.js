import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import {
  attendanceToggle,
  getAttendanceForAllEmployees,
  getMonthlyAttendance,
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

////// Dynamic Routes /////
attendanceRouter.get(
  "/attendance/monthly/:employeeId",
  authMiddleware,
  getMonthlyAttendance
);

export default attendanceRouter;
