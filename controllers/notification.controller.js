import Notification from "../models/notification.model.js";
import { response } from "../utils/response.js";

export const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const employeeId = req.employee.id;
    const totalNotifications = await Notification.countDocuments({
      to: employeeId,
    });
    const unReadCount = await Notification.countDocuments({
      to: employeeId,
      isRead: false,
    });
    const totalPages = Math.ceil(totalNotifications / limit);

    const notifications = await Notification.find({ to: employeeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("from", "username employeeId email");

    response(res, 200, "fetched all notifications", {
      notifications,
      unReadCount,
      page,
      limit,
      totalPages,
      totalNotifications,
    });
  } catch (error) {
    response(res, 500, "Internal Server errro");
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const result = await Notification.updateMany(
      { to: employeeId, isRead: false },
      { $set: { isRead: true } }
    );

    if (result.modifiedCount === 0) {
      return response(res, 404, "No unread notifications found");
    }

    response(res, 200, "All notifications marked as read");
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};
