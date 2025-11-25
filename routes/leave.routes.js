import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import { applyLeave } from "../controllers/leave.controller.js";

const leaveRouter = express.Router();

leaveRouter.post("/leave/apply", authMiddleware, applyLeave);

export default leaveRouter;
