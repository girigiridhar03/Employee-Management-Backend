import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import { getAllNotifications } from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/notifications", authMiddleware, getAllNotifications);

export default notificationRouter;
