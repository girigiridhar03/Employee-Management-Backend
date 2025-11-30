import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import {
  adminSummary,
  adminViewLeaveHistory,
  applyLeave,
  employeesLeaveHistory,
  getleavesManagerTeam,
  managerApproveAndReject,
} from "../controllers/leave.controller.js";
import adminHrAndLoggedUser from "../middlewares/adminAndHr.middleware.js";

const leaveRouter = express.Router();

///// Static Routes /////
leaveRouter.post("/leave/apply", authMiddleware, applyLeave);
leaveRouter.get("/leave/manager/team", authMiddleware, getleavesManagerTeam);

///// Dashboard Routes /////
leaveRouter.get(
  "/leave/admin",
  authMiddleware,
  adminHrAndLoggedUser,
  adminViewLeaveHistory
);
leaveRouter.get(
  "/leave/admin/summary",
  authMiddleware,
  adminHrAndLoggedUser,
  adminSummary
);

///// Dynamic Routes /////
leaveRouter.put(
  "/leave/action/:leaveId",
  authMiddleware,
  managerApproveAndReject
);
leaveRouter.get(
  "/leave/history/:id",
  authMiddleware,
  adminHrAndLoggedUser,
  employeesLeaveHistory
);

export default leaveRouter;
