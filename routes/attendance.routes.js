import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import { attendanceToggle } from "../controllers/attendance.controller.js";

const attendanceRouter = express.Router();

attendanceRouter.post("/attendance/toggle", authMiddleware, attendanceToggle);

export default attendanceRouter;
