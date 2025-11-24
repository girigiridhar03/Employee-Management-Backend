import dayjs from "dayjs";
import { response } from "../utils/response.js";
import Attendance from "../models/attendance.model.js";

export const attendanceToggle = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const today = dayjs().format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({
      employeeDetails: employeeId,
      date: today,
    });

    if (!attendance) {
      const newAttendance = await Attendance.create({
        employeeDetails: employeeId,
        date: today,
        status: "check-in",
        checkIn: new Date(),
      });

      return response(res, 200, "checkedIn Successfully", {
        checkIn: newAttendance.checkIn,
        status: newAttendance.status,
      });
    }

    if (!attendance.checkOut) {
      attendance.checkOut = new Date();
      attendance.status = "check-out";

      await attendance.save();

      return response(res, 200, "checkedOut successfully", {
        checkOut: attendance.checkOut,
        status: attendance.status,
        totalHours: attendance.totalHours,
      });
    }

    return response(res, 200, "Already checkedout for today", {
      status: attendance.status,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      totalHours: attendance.totalHours,
    });
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};
