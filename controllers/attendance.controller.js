import dayjs from "dayjs";
import { response } from "../utils/response.js";
import Attendance from "../models/attendance.model.js";
import Employee from "../models/employee.model.js";
import mongoose from "mongoose";
import Holiday from "../models/holiday.model.js";

export const attendanceToggle = async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const today = dayjs().format("YYYY-MM-DD");
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();

    const holiday = await Holiday.findOne({
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    });

    if (holiday) {
      return response(res, 400, "Today is holiday");
    }

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

export const getAttendanceForAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const skip = (page - 1) * size;
    const totalEmployees = await Employee.countDocuments();
    const totalPage = Math.ceil(totalEmployees / size);

    const allEmployees = await Employee.find({ status: "active" })
      .skip(skip)
      .limit(size)
      .select("username employeeId email designation")
      .populate("reportingTo", "username employeeId email designation");

    const today = dayjs().format("YYYY-MM-DD");
    const attendanceRecord = await Attendance.find({ date: today });
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();
    const holiday = await Holiday.findOne({
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    });

    const attendanceMap = {};

    attendanceRecord.forEach((att) => {
      attendanceMap[String(att.employeeDetails)] = att;
    });

    const enRichedEmployees = allEmployees.map((emp) => {
      if (holiday) {
        return {
          ...emp._doc,
          status: "holiday",
        };
      }

      const att = attendanceMap[String(emp._id)];

      if (!att) {
        return {
          ...emp._doc,
          status: "yet-to-checkin",
        };
      }

      return {
        ...emp._doc,
        status: att.status,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        totalHours: att.totalHours,
      };
    });

    response(res, 200, "Attendance Analytics Fetched successfully", {
      attendance: enRichedEmployees,
      totalPage,
      page,
      size,
      totalEmployees,
    });
  } catch (error) {
    response(res, 500, "Internal server error");
  }
};

export const getMonthlyAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!mongoose.isValidObjectId(employeeId)) {
      return response(res, 400, "Invalid Employee ID");
    }
    const month = req.query.month || dayjs().format("YYYY-MM");

    const startMonth = dayjs(month).startOf("month").toDate();
    const endMonth = dayjs(month).endOf("month").toDate();

    const attendanceByMonth = await Attendance.find({
      employeeDetails: employeeId,
      date: { $gte: startMonth, $lte: endMonth },
    });

    response(res, 200, `Fetched Attendance of ${month}`, attendanceByMonth);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server Error");
  }
};
