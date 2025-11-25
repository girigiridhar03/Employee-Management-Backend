import { response } from "../utils/response.js";
import Leave from "../models/leave.model.js";
import Employee from "../models/employee.model.js";
import dayjs from "dayjs";

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, description, fromDate, toDate } = req.body;
    const employeeId = req.employee.id;

    const employee = await Employee.findById(employeeId).select("reportingTo");

    const requiredFields = ["leaveType", "fromDate", "toDate"];

    for (let field of requiredFields) {
      if (!req.body[field]) {
        return response(res, 400, `${field} is required`);
      }
    }

    const from = dayjs(fromDate).startOf("day").toDate();
    const to = dayjs(toDate).endOf("day").toDate();

    if (dayjs(to).isBefore(dayjs(from))) {
      return response(res, 400, "toDate must be same or after fromDate");
    }

    const conflict = await Leave.findOne({
      employeeDetails: employeeId,
      status: {
        $ne: "rejected",
      },
      $or: [
        {
          fromDate: {
            $lte: to,
          },
          toDate: {
            $gte: from,
          },
        },
      ],
    });

    if (conflict) {
      return response(res, 409, "Leave already applied for this period");
    }

    const leave = await Leave({
      employeeDetails: employeeId,
      leaveType,
      description,
      fromDate,
      toDate,
      reportingTo: employee.reportingTo,
    });

    await leave.save();

    const getLeaveDetails = await Leave.findById(leave._id)
      .populate("employeeDetails", "username email employeeId")
      .populate("reportingTo", "username email employeeId");

    response(res, 201, "Leave applied successfully", getLeaveDetails);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server Error");
  }
};
