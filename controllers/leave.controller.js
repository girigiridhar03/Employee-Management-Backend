import { response } from "../utils/response.js";
import Leave from "../models/leave.model.js";
import Employee from "../models/employee.model.js";
import dayjs from "dayjs";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, description, fromDate, toDate } = req.body;
    const employeeId = req.employee.id;
    const leaveTypeArr = ["sick leave", "casual leave", "paid leave"];
    const employee = await Employee.findById(employeeId).select(
      "reportingTo _id username"
    );

    const requiredFields = ["leaveType", "fromDate", "toDate"];

    for (let field of requiredFields) {
      if (!req.body[field]) {
        return response(res, 400, `${field} is required`);
      }
    }

    if (!leaveTypeArr.includes(leaveType)) {
      return response(res, 400, "Invalid leave type");
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
      employeeDetails: employee._id,
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

    const fDate = dayjs(getLeaveDetails.fromDate).format("MMM-DD");
    const tDate = dayjs(getLeaveDetails.toDate).format("MMM-DD");

    const notify = {
      title: `Leave Request Submitted`,
      message: `Employee ${employee.username} applied for leave from ${fDate} to ${tDate} `,
      from: employeeId,
      to: employee.reportingTo,
      type: "leave",
    };

    await Notification.create(notify);

    response(res, 201, "Leave applied successfully", getLeaveDetails);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server Error");
  }
};

export const getleavesManagerTeam = async (req, res) => {
  try {
    const { role, id: managerId } = req.employee;

    if (role === "employee") {
      return response(res, 403, "Access Denied");
    }

    const employees = await Employee.find({ reportingTo: managerId }).select(
      "_id"
    );

    const teamsId = employees.map((emp) => emp._id);

    const todayStart = dayjs().startOf("day").toDate();

    const leaves = await Leave.find({
      employeeDetails: { $in: teamsId },
      $or: [{ status: "pending" }, { toDate: { $gte: todayStart } }],
    })
      .populate("employeeDetails", "username email employeeId designation dob")
      .populate("reportingTo", "username email employeeId dob");

    response(res, 200, "Fetched leaves of team members", leaves);
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const managerApproveAndReject = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.query;
    const managerId = req.employee.id;

    if (req.employee.role === "employee") {
      return response(res, 403, "Access Denied");
    }

    if (!mongoose.isValidObjectId(leaveId)) {
      return response(res, 400, `Invalid ID:${leaveId}`);
    }

    const statusArr = ["rejected", "approved"];

    if (!status) {
      return response(res, 400, "Status is required");
    }

    if (!statusArr.includes(status?.toLowerCase())) {
      return response(res, 400, "Status must be approved or rejected");
    }

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return response(res, 400, "Leave not found");
    }

    if (String(leave.reportingTo) !== String(managerId)) {
      return response(
        res,
        403,
        "You are not allowed to take action on this leave"
      );
    }

    if (leave.status !== "pending") {
      return response(res, 400, `Leave already ${leave.status}`);
    }
    const todayStart = dayjs().startOf("day").toDate();
    if (leave.toDate < todayStart) {
      return response(res, 400, "Cannot approve/reject past leave");
    }

    leave.status = status?.toLowerCase();
    await leave.save();

    const fDate = dayjs(leave.fromDate).format("MMM-DD");
    const tDate = dayjs(leave.toDate).format("MMM-DD");

    let message;

    if (status?.toLowerCase() === "rejected") {
      message = `Your leave request for ${fDate} to ${tDate} was ${status?.toLowerCase()}.`;
    }

    if (status?.toLowerCase() === "approved") {
      message = `Your leave from ${fDate} to ${tDate} has been ${status?.toLowerCase()}.`;
    }

    const notify = {
      title: `Leave ${status?.toLowerCase()}`,
      message,
      from: leave.reportingTo,
      to: leave.employeeDetails,
      type: "leave",
    };

    await Notification.create(notify);

    return response(res, 200, `Leave ${status} successfully`, leave);
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const employeesLeaveHistory = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { month } = req.query;

    if (!mongoose.isValidObjectId(employeeId)) {
      return response(res, 400, `Invalid ID: ${employeeId}`);
    }

    let query = {
      employeeDetails: employeeId,
    };

    if (month) {
      const isValidMonth = dayjs(month, "YYYY-MM", true).isValid();
      if (!isValidMonth) {
        return response(res, 400, "Month must be in YYYY-MM format");
      }

      let startMonth = dayjs(month).startOf("month").toDate();
      let endMonth = dayjs(month).endOf("month").toDate();

      query.fromDate = { $gte: startMonth };
      query.toDate = { $lte: endMonth };
    }

    const leaveRecords = await Leave.find(query)
      .populate("reportingTo", "username employeeId email designation")
      .populate("employeeDetails", "username employeeId email designation")
      .sort({ fromDate: -1 });

    response(res, 200, "Fetched leaves history", leaveRecords);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server error");
  }
};

export const adminViewLeaveHistory = async (req, res) => {
  try {
    const {
      from,
      to,
      status,
      managerId,
      employeeId,
      page = 1,
      limit = 10,
      sortBy = "fromDate",
      sort = "desc",
    } = req.query;

    const query = {};
    const allowedArray = ["pending", "rejected", "approved"];

    if (status) {
      if (!allowedArray.includes(status.toLowerCase())) {
        return response(res, 400, "Invalid Status value");
      }

      query.status = status.toLowerCase();
    }

    if (managerId) {
      if (!mongoose.isValidObjectId(managerId)) {
        return response(res, 400, `Invalid ManagerID: ${managerId}`);
      }
      query.reportingTo = managerId;
    }

    if (employeeId) {
      if (!mongoose.isValidObjectId(employeeId)) {
        return response(res, 400, `Invalid employeeID: ${employeeId}`);
      }
      query.employeeDetails = employeeId;
    }

    if (from || to) {
      const fromDate = from ? dayjs(from, "YYYY-MM-DD", true) : null;
      const toDate = to ? dayjs(to, "YYYY-MM-DD", true) : null;

      if (fromDate && !fromDate.isValid()) {
        return response(res, 400, "Invalid 'from' Date,use YYYY-MM-DD");
      }
      if (toDate && !toDate.isValid()) {
        return response(res, 400, "Invalid 'from' Date,use YYYY-MM-DD");
      }

      query.$and = [];

      if (from) {
        query.$and.push({
          toDate: { $gte: fromDate.startOf("day").toDate() },
        });
      }
      if (to) {
        query.$and.push({
          fromDate: { $lte: to.startOf("day").toDate() },
        });
      }
    }

    const validSortFields = ["fromDate", "toDate"];
    const validSortOrder = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) {
      return response(res, 400, "Invalid field");
    }

    if (!validSortOrder.includes(sort)) {
      return response(res, 400, "Invalid sort order");
    }

    const sortObj = {
      [sortBy]: sort === "asc" ? 1 : -1,
    };

    const size = parseInt(limit);
    const skip = (parseInt(page) - 1) * size;
    const totalRecords = await Leave.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / size);

    const leaveRecords = await Leave.find(query)
      .populate("employeeDetails", "username employeeId email designation")
      .populate("reportingTo", "username employeeId email designation")
      .sort(sortObj)
      .skip(skip)
      .limit(size);

    response(res, 200, "Fetched all leaves", {
      leaveRecords,
      page,
      size,
      totalRecords,
      totalPages,
    });
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const adminSummary = async (req, res) => {
  try {
    const { m } = req.query;
    const month = m ? dayjs(m, "YYYY-MM") : dayjs().format("YYYY-MM");

    const monthStart = dayjs(month).startOf("month").toDate();
    const monthEnd = dayjs(month).endOf("month").toDate();

    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();

    const summary = await Leave.aggregate([
      {
        $facet: {
          todaySummary: [
            {
              $match: {
                fromDate: { $lte: todayEnd },
                toDate: { $gte: todayStart },
              },
            },
            {
              $group: {
                _id: "$status",
                count: {
                  $sum: 1,
                },
              },
            },
          ],
          upComingLeaves: [
            {
              $match: {
                fromDate: {
                  $gte: todayEnd,
                },
              },
            },
            {
              $count: "count",
            },
          ],
          monthlyLeaves: [
            {
              $match: {
                fromDate: { $lte: monthEnd },
                toDate: { $gte: monthStart },
              },
            },
            {
              $count: "total",
            },
          ],
          monthlyByType: [
            {
              $match: {
                fromDate: { $lte: monthEnd },
                toDate: { $gte: monthStart },
              },
            },
            {
              $group: {
                _id: "$leaveType",
                count: {
                  $sum: 1,
                },
              },
            },
            {
              $project: {
                _id: 0,
                leaveType: "$_id",
                count: 1,
              },
            },
          ],
          monthlyByStatus: [
            {
              $match: {
                fromDate: { $lte: monthEnd },
                toDate: { $gte: monthStart },
              },
            },
            {
              $group: {
                _id: "$status",
                count: {
                  $sum: 1,
                },
              },
            },
            {
              $project: {
                _id: 0,
                status: "$_id",
                count: 1,
              },
            },
          ],
          byDepartment: [
            {
              $match: {
                fromDate: { $lte: monthEnd },
                toDate: { $gte: monthStart },
              },
            },
            {
              $lookup: {
                from: "employees",
                localField: "employeeDetails",
                foreignField: "_id",
                as: "emp",
              },
            },
            {
              $unwind: "$emp",
            },
            {
              $group: {
                _id: "$emp.designation",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                designation: "$_id",
                count: 1,
              },
            },
          ],
          pendingByManager: [
            {
              $match: {
                status: "pending",
              },
            },
            {
              $group: {
                _id: "$reportingTo",
                pendingCount: {
                  $sum: 1,
                },
              },
            },
            {
              $lookup: {
                from: "employees",
                localField: "_id",
                foreignField: "_id",
                as: "manager",
              },
            },
            {
              $unwind: "$manager",
            },
            {
              $project: {
                _id: 0,
                managerId: "$manager.employeeId",
                managerName: "$manager.username",
                pendingCount: 1,
              },
            },
          ],
        },
      },
    ]);

    const data = summary[0];

    const today = {
      onLeave: data.todaySummary.find((i) => i._id === "approved")?.count || 0,
      pending: data.todaySummary.find((i) => i._id === "pending")?.count || 0,
      approved: data.todaySummary.find((i) => i._id === "approved")?.count || 0,
      rejected: data.todaySummary.find((i) => i._id === "rejected")?.count || 0,
    };

    response(res, 200, "Fetched leave summary", {
      date: dayjs().format("YYYY-MM-DD"),
      month,
      summary: {
        today,
        upComingLeaves: data.upComingLeaves[0]?.count || 0,
        monthlyLeaves: {
          total: data.monthlyLeaves[0]?.total,
          byType: data.monthlyByType,
          byStatus: data.monthlyByStatus,
          byDepartment: data.byDepartment,
        },
        pendingApprovalsByManager: data.pendingByManager,
      },
    });
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server error");
  }
};
