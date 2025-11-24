import { response } from "../utils/response.js";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response(res, 401, "Access denied, token missing");
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return response(res, 401, "Access denied, invalid token format");
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.employee = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return response(res, 401, "Session expired, please log in again");
    }

    if (error.name === "JsonWebTokenError") {
      return response(res, 401, "Invalid token, please log in again");
    }

    if (error.name === "NotBeforeError") {
      return response(res, 401, "Token not active yet");
    }
    response(res, 500, "Internal Server error");
  }
};
