import dayjs from "dayjs";
import mongoose from "mongoose";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
dayjs.extend(isSameOrAfter);

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
          return dayjs(val).isSameOrAfter(dayjs(this.fromDate));
        },
        message: "toDate must be same or after fromDate",
      },
    },
    classification: {
      type: String,
      required: true,
      enum: ["holiday", "restricted holiday"],
    },

    totalDays: {
      type: Number,
    },
  },
  { timestamps: true }
);

holidaySchema.pre("save", function (next) {
  const diff = dayjs(this.toDate).diff(dayjs(this.fromDate), "day") + 1;
  this.totalDays = diff;
  next();
});

const Holiday = mongoose.model("Holiday", holidaySchema);

export default Holiday;
