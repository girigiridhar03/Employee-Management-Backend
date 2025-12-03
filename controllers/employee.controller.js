import mongoose from "mongoose";
import { uploadToCloudinary } from "../config/cloundinary.config.js";
import Employee from "../models/employee.model.js";
import { response } from "../utils/response.js";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import Attendance from "../models/attendance.model.js";
import Leave from "../models/leave.model.js";
import Holiday from "../models/holiday.model.js";

export const createEmployee = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      dob,
      gender,
      designation,
      salary,
      role,
      reportingTo,
    } = req.body;
    const file = req.file?.path;
    const requiredFields = [
      "username",
      "email",
      "password",
      "dob",
      "gender",
      "designation",
      "salary",
      "reportingTo",
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return response(res, 400, `${field} is required`);
      }
    }

    let uploadedFile = null;

    if (file) {
      uploadedFile = await uploadToCloudinary(file);
    }

    const newEmployee = new Employee({
      username,
      email,
      dob,
      gender,
      designation,
      salary,
      role,
      password,
      createdBy: req.employee?.id,
      reportingTo,
      ...(uploadedFile && {
        profilePic: {
          url: uploadedFile?.secure_url,
          publicId: uploadedFile?.public_id,
        },
      }),
    });
    const generatedId = await newEmployee.generateemployeeId();
    newEmployee.employeeId = generatedId;
    await newEmployee.save();

    response(res, 201, "Employee Created Successfully");
  } catch (error) {
    if (error.code === 11000) {
      return response(res, 400, "Email is already Exist");
    }
    response(res, 500, "Internal Server Error");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    for (const field of ["email", "password"]) {
      if (!req.body[field]) {
        return response(res, 400, `${field}is required`);
      }
    }

    const checkEmployee = await Employee.findOne({ email });

    if (!checkEmployee) {
      return response(res, 400, "Invalid Credentials");
    }

    const isPassword = await checkEmployee.matchPassword(password);

    if (!isPassword) {
      return response(res, 400, "Invalid Credentials");
    }

    const token = jwt.sign(
      {
        id: checkEmployee?._id,
        employeeId: checkEmployee?.employeeId,
        email: checkEmployee?.email,
        username: checkEmployee?.username,
        role: checkEmployee?.role,
        reportingTo: checkEmployee?.reportingTo,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    response(res, 200, "Logged in successfully", { token });
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const totalEmployees = await Employee.countDocuments();
    const skip = (page - 1) * size;
    const totalPages = Math.ceil(totalEmployees / size);

    const allEmployees = await Employee.find({ status: "active" })
      .populate("reportingTo", "-password -salary -status")
      .select("-password -createdBy -salary -status")
      .skip(skip)
      .limit(size);

    const today = dayjs().format("YYYY-MM-DD");

    const attendanceRecords = await Attendance.find({ date: today });

    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();

    const leaveRecords = await Leave.find({
      status: { $ne: "rejected" },
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    });
    const holiday = await Holiday.findOne({
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    });
    const attendanceMap = {};
    const leaveMap = {};

    attendanceRecords.forEach((att) => {
      attendanceMap[String(att.employeeDetails)] = att;
    });

    leaveRecords.forEach((leave) => {
      leaveMap[String(leave.employeeDetails)] = leave;
    });

    const enrichedEmployee = allEmployees.map((emp) => {
      if (holiday) {
        return {
          ...emp._doc,
          attendance: {
            status: "holiday",
          },
        };
      }

      const att = attendanceMap[String(emp._id)];
      const leave = leaveMap[String(emp._id)];

      if (leave) {
        return {
          ...emp._doc,
          attendance: {
            status: "Leave",
          },
        };
      } else if (!att) {
        return {
          ...emp._doc,
          attendance: {
            status: "yet-to-checkin",
          },
        };
      }

      return {
        ...emp._doc,
        attendance: {
          status: att.status,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          totalHours: att.totalHours,
        },
      };
    });

    response(res, 200, "Fetched all employees", {
      allEmployees: enrichedEmployee,
      totalPages,
      page,
      size,
      totalEmployees,
    });
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};

export const getSingleEmployeeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return response(res, 400, `Invalid ID:${id}`);
    }

    const today = dayjs().format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({
      employeeDetails: id,
      date: today,
    });
    let obj = {};

    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();

    const leave = await Leave.find({
      employeeDetails: id,
      status: { $ne: "rejected" },
      fromDate: {
        $lte: todayEnd,
      },
      toDate: {
        $gte: todayStart,
      },
    });

    const holiday = await Holiday.findOne({
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    });
    if (holiday) {
      obj.status = "holiday";
    } else if (leave) {
      obj.status = "Leave";
    } else if (!attendance) {
      obj.status = "yet-to-checkin";
    } else {
      obj.status = attendance.status;
      obj.checkIn = attendance.checkIn;
      obj.checkOut = attendance.checkOut;
      obj.totalHours = attendance.totalHours;
      obj.date = attendance.date;
    }

    const fullAccessRoles = ["admin", "hr"];

    let selectFields;

    if (fullAccessRoles.includes(req.employee.role)) {
      selectFields = "-password";
    } else if (String(req.employee.id) === String(id)) {
      selectFields = "-password";
    } else {
      selectFields = "-password -salary";
    }
    const employee = await Employee.findById(id)
      .populate("reportingTo", "-password -salary -status")
      .select(selectFields);

    if (!employee) {
      return response(res, 404, "Employee not found");
    }

    response(res, 200, "Details fetched", { employee, attendance: obj });
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return response(res, 400, `Invalid ID:${id}`);
    }

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return response(res, 404, "Employee not found");
    }

    response(res, 200, "Employee deleted");
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};

export const updatedDetails = async (req, res) => {
  try {
    const employeeAllowedUpdates = ["username", "profilePic", "gender", "dob"];
    const adminAllowedUpdates = [
      "username",
      "email",
      "dob",
      "gender",
      "designation",
      "salary",
      "role",
      "status",
      "reportingTo",
      "createdBy",
    ];

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return response(res, 400, `Invalid ID: ${id}`);
    }

    const update = Object.keys(req.body);

    let allowedUpdate;

    if (req.employee.role === "admin" || req.employee.role === "hr") {
      allowedUpdate = adminAllowedUpdates;
    } else if (String(req.employee.id) === String(id)) {
      allowedUpdate = employeeAllowedUpdates;
    } else {
      return response(res, 403, "Access Denied");
    }

    const isValidOperation = update.every((update) =>
      allowedUpdate.includes(update)
    );

    if (!isValidOperation) {
      return response(res, 400, "Invalid fields to update");
    }

    const employee = await Employee.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!employee) {
      return response(res, 404, "Employee not found");
    }

    response(res, 200, "Employee updated successfully", employee);
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const teamMembers = async (req, res) => {
  try {
    const employee = req.employee;

    const teamMembers = await Employee.find({
      reportingTo: employee.reportingTo,
    })
      .populate("reportingTo", "-password -salary -status")
      .populate("createdBy", "-password -salary -status")
      .select("-password -createdBy -salary -status");

    response(res, 200, "Team members feteched succesfully", teamMembers);
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const employeesByDesignation = async (req, res) => {
  try {
    const filterBy = req.query.filter;

    let query = {};

    if (filterBy) {
      query = {
        designation: filterBy,
      };
    }
    const allEmployessByDesignation = await Employee.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$designation",
          employees: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          designation: "$_id",
          employees: 1,
        },
      },
      {
        $sort: { employees: -1 },
      },
    ]);

    if (filterBy && allEmployessByDesignation.length === 0) {
      return response(res, 200, "No employees found", [
        { designation: filterBy, employees: 0 },
      ]);
    }

    response(
      res,
      200,
      "Fetched Employees By Designation",
      allEmployessByDesignation
    );
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const managerDetails = async (req, res) => {
  try {
    const filterBy = req.query.filter;

    let query = { role: "manager" };

    if (filterBy) {
      query.designation = filterBy;
    }

    const managers = await Employee.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "reportingTo",
          as: "employees",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
        },
      },
      {
        $project: {
          _id: 0,
          managerId: "$employeeId",
          managerName: "$username",
          designation: 1,
          employeeCount: 1,
        },
      },
    ]);

    response(res, 200, "Fetched Manager Details successfully", managers);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server error");
  }
};

export const getSalaryStatsByDesignation = async (req, res) => {
  try {
    const filterBy = req?.query?.filter;

    let query = { role: "employee" };

    if (filterBy) {
      query.designation = filterBy;
    }

    const salaryStats = await Employee.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$designation",
          totalSalary: {
            $sum: "$salary",
          },
          averageSalary: {
            $avg: "$salary",
          },
          maxSalary: {
            $max: "$salary",
          },
          minSalary: {
            $min: "$salary",
          },
          employeeCount: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          designation: "$_id",
          averageSalary: 1,
          totalSalary: 1,
          maxSalary: 1,
          minSalary: 1,
          employeeCount: 1,
        },
      },
      {
        $sort: {
          totalSalary: -1,
        },
      },
    ]);

    console.log(salaryStats);
    response(res, 200, "fetched salary stats successfully", salaryStats);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server error");
  }
};

export const getSalaryExtremesByDesignation = async (req, res) => {
  try {
    const filterBy = req?.query?.filter;

    let query = { role: "employee" };

    if (filterBy) {
      query.designation = filterBy;
    }

    const salaryExtremesByDesignation = await Employee.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$designation",
          employees: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $unwind: "$employees",
      },
      {
        $sort: {
          "employees.salary": -1,
        },
      },
      {
        $group: {
          _id: "$_id",
          highestPaid: {
            $first: "$employees",
          },
          lowestPaid: {
            $last: "$employees",
          },
          employeeCount: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          designation: "$_id",
          highestPaid: {
            username: "$highestPaid.username",
            email: "$highestPaid.email",
            salary: "$highestPaid.salary",
          },
          lowestPaid: {
            username: "$lowestPaid.username",
            email: "$lowestPaid.email",
            salary: "$lowestPaid.salary",
          },
          employeeCount: 1,
        },
      },
    ]);

    response(
      res,
      200,
      "fetched salary extremes by designation",
      salaryExtremesByDesignation
    );
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const hierarchyTreeData = async (req, res) => {
  try {
    const tree = await Employee.aggregate([
      {
        $match: {
          designation: "CEO",
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "reportingTo",
          as: "managers",
        },
      },

      {
        $lookup: {
          from: "employees",
          let: { managersArr: "$managers" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$reportingTo", "$$managersArr._id"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                username: 1,
                designation: 1,
                reportingTo: 1,
              },
            },
          ],
          as: "allEmployees",
        },
      },

      {
        $addFields: {
          children: {
            $map: {
              input: "$managers",
              as: "mgr",
              in: {
                name: "$$mgr.username",
                designation: "$$mgr.designation",
                children: {
                  $filter: {
                    input: "$allEmployees",
                    as: "emp",
                    cond: {
                      $eq: ["$$emp.reportingTo", "$$mgr._id"],
                    },
                  },
                },
              },
            },
          },
        },
      },

      {
        $addFields: {
          children: {
            $map: {
              input: "$children",
              as: "mgr",
              in: {
                name: "$$mgr.name",
                designation: "$$mgr.designation",
                children: {
                  $map: {
                    input: "$$mgr.children",
                    as: "emp",
                    in: {
                      name: "$$emp.username",
                      designation: "$$emp.designation",
                    },
                  },
                },
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          name: "$username",
          designation: "$designation",
          children: 1,
        },
      },
    ]);

    response(res, 200, "Fetched Hierarchy Tree Successfully", tree[0]);
  } catch (error) {
    console.log(error);
    response(res, 500, "Internal Server error");
  }
};
