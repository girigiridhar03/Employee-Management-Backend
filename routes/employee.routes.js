import express from "express";
import {
  createEmployee,
  deleteEmployee,
  employeesByDesignation,
  getAllEmployees,
  getSalaryExtremesByDesignation,
  getSalaryStatsByDesignation,
  getSingleEmployeeDetails,
  hierarchyTreeData,
  login,
  logout,
  managerDetails,
  teamMembers,
  updatedDetails,
} from "../controllers/employee.controller.js";
import { authMiddleware } from "../middlewares/auth.middlware.js";
import adminHrAndLoggedUser from "../middlewares/adminAndHr.middleware.js";

const employeeRouter = express.Router();

///// Auth /////
employeeRouter.post(
  "/admin/employee",
  authMiddleware,
  adminHrAndLoggedUser,
  createEmployee
);
employeeRouter.post("/auth/login", login);
employeeRouter.post("/auth/logout", authMiddleware, logout);

///// Static Routes /////
employeeRouter.get("/employees", authMiddleware, getAllEmployees);
employeeRouter.get("/employee/team", authMiddleware, teamMembers);

///// Analytics /////
employeeRouter.get(
  "/analytics/employees/by-designation",
  authMiddleware,
  adminHrAndLoggedUser,
  employeesByDesignation
);
employeeRouter.get(
  "/analytics/employees/by-manager",
  authMiddleware,
  adminHrAndLoggedUser,
  managerDetails
);
employeeRouter.get(
  "/analytics/salary/by-designation",
  authMiddleware,
  adminHrAndLoggedUser,
  getSalaryStatsByDesignation
);
employeeRouter.get(
  "/analytics/salary/extremes-by-designation",
  authMiddleware,
  adminHrAndLoggedUser,
  getSalaryExtremesByDesignation
);

// Employee Tree Hierarchy
employeeRouter.get(
  "/employee/tree-hierarchy",
  authMiddleware,
  hierarchyTreeData
);

///// Dynamic Routes /////
employeeRouter.get("/employee/:id", authMiddleware, getSingleEmployeeDetails);
employeeRouter.put("/employee/:id", authMiddleware, updatedDetails);
employeeRouter.delete(
  "/employee/:id",
  authMiddleware,
  adminHrAndLoggedUser,
  deleteEmployee
);

export default employeeRouter;
