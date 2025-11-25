import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

///// Imports of Routes /////
import employeeRouter from "./routes/employee.routes.js";
import attendanceRouter from "./routes/attendance.routes.js";
import leaveRouter from "./routes/leave.routes.js";

///// Routes /////
app.use("/api", employeeRouter);
app.use("/api", attendanceRouter);
app.use("/api", leaveRouter);

export default app;
