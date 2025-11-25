import mongoose from "mongoose";
import dayjs from "dayjs";

const attendanceSchema = new mongoose.Schema(
  {
    employeeDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
    },
    totalHours: {
      type: Number,
    },
    date: {
      type: Date,
      default: () => dayjs().startOf("day").toDate(),
    },
    isPresent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["check-in", "check-out", "yet-to-checkin"],
      default: "yet-to-checkin",
    },
  },
  { timestamps: true }
);
attendanceSchema.index({ employeeDetails: 1, date: 1 }, { unique: true });

attendanceSchema.pre("save", function (next) {
  if (!this.checkIn) return next();

  this.isPresent = true;
  next();
});

attendanceSchema.pre("save", async function (next) {
  if (!this.checkIn || !this.checkOut) return next();
  const checkIn = dayjs(this.checkIn);
  const checkOut = dayjs(this.checkOut);
  const diffInMins = checkOut.diff(checkIn, "minute");
  const hours = diffInMins / 60;
  this.totalHours = parseFloat(hours.toFixed(2));

  next();
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
