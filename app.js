import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const allowOrigin = ["http://localhost:5173"];
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowOrigin.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by cors"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

///// Imports of Routes /////
import employeeRouter from "./routes/employee.routes.js";
import attendanceRouter from "./routes/attendance.routes.js";
import leaveRouter from "./routes/leave.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import holidayRouter from "./routes/holiday.routes.js";

///// Routes /////
app.use("/api", employeeRouter);
app.use("/api", attendanceRouter);
app.use("/api", leaveRouter);
app.use("/api", notificationRouter);
app.use("/api", holidayRouter);

export default app;
