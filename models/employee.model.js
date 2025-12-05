import mongoose from "mongoose";
import Counter from "./counter.model.js";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Others"],
    },
    designation: {
      type: String,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    role: {
      type: String,
      enum: ["employee", "manager", "hr", "admin"],
      default: "employee",
    },
    status: {
      type: String,
      enum: ["active", "deactive"],
      default: "active",
    },
    profilePic: {
      url: {
        type: String,
      },
      publicId: {
        type: String,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: function () {
        return this.role !== "admin";
      },
    },
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      index: true,
      required: function () {
        return this.role !== "admin";
      },
    },
    sessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
employeeSchema.virtual("calculatedAge").get(function () {
  if (!this.dob) return null;
  return dayjs().diff(dayjs(this.dob), "year");
});

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

employeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

employeeSchema.methods.generateemployeeId = async function () {
  const doc = this;

  const counter = await Counter.findByIdAndUpdate(
    { _id: doc.role },
    {
      $inc: { seq: 1 },
    },
    {
      new: true,
      upsert: true,
    }
  );

  const paddedNumber = String(counter.seq).padStart(3, "0");

  const prefix = doc.role === "manager" ? "M" : doc.role === "hr" ? "H" : "E";
  return `${prefix}${paddedNumber}`;
};

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
