import dayjs from "dayjs";
import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employeeDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["sick leave", "casual leave", "paid leave"],
    },
    description: {
      type: String,
      trim: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (val) {
          return val >= this.fromDate;
        },
        message: "To Date must be same or after From Date",
      },
    },
    totalDays: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["pending", "rejected", "approved"],
      default: "pending",
    },
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
  },
  { timestamps: true }
);

leaveSchema.pre("save", function (next) {
  if (this.fromDate && this.toDate) {
    const diffInDays = dayjs(this.toDate).diff(dayjs(this.fromDate), "day") + 1;
    this.totalDays = diffInDays;
  }

  next();
});

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;
