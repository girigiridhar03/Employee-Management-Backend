import express from "express";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import {
  getAllNotifications,
  markAllNotificationsAsRead,
} from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/notifications", authMiddleware, getAllNotifications);
notificationRouter.put(
  "/notifications/read-all",
  authMiddleware,
  markAllNotificationsAsRead
);

export default notificationRouter;
