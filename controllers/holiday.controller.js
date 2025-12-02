import dayjs from "dayjs";
import Holiday from "../models/holiday.model.js";
import { response } from "../utils/response.js";
import mongoose from "mongoose";

export const createHoliday = async (req, res) => {
  try {
    const { name, fromDate, toDate, classification } = req.body;

    const requiredFields = ["name", "fromDate", "toDate", "classification"];
    const classificationArray = ["holiday", "restricted holiday"];
    for (let field of requiredFields) {
      if (!req.body[field]) {
        return response(res, 400, `${field} is required`);
      }
    }

    const from = dayjs(fromDate).startOf("day").toDate();
    const to = dayjs(toDate).endOf("day").toDate();

    if (dayjs(to).isBefore(dayjs(from))) {
      return response(res, 400, "toDate must be same or after fromDate");
    }

    if (!classificationArray.includes(classification?.toLowerCase())) {
      return response(
        res,
        400,
        `Invalid Classification,Only Allowed: ${classificationArray.toString()}`
      );
    }

    const conflict = await Holiday.findOne({
      $or: [
        {
          fromDate: { $lte: to },
          toDate: { $gte: from },
        },
      ],
    });

    if (conflict) {
      return response(res, 409, "Holiday is already is exists for this period");
    }

    const newHoliday = new Holiday({
      name,
      fromDate,
      toDate,
      classification: classification?.toLowerCase(),
    });

    await newHoliday.save();

    response(res, 200, "Holiday is created", newHoliday);
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const { name, fromDate, toDate, classification } = req.body;
    const { id } = req.params;
    const classificationArray = ["holiday", "restricted holiday"];

    if (!id) {
      return response(res, 400, "ID is required");
    }

    if (!mongoose.isValidObjectId(id)) {
      return response(res, 400, `Invalid ID: ${id}`);
    }

    const holiday = await Holiday.findById(id);

    if (!holiday) {
      return response(res, 404, `No hoilday found for this ID: ${id}`);
    }

    const from = fromDate
      ? dayjs(fromDate).startOf("day").toDate()
      : holiday.fromDate;
    const to = toDate ? dayjs(toDate).endOf("day").toDate() : holiday.toDate;

    if (dayjs(to).isBefore(dayjs(from))) {
      return response(res, 400, "toDate must be same or after fromDate");
    }

    if (classification) {
      if (!classificationArray.includes(classification?.toLowerCase())) {
        return response(
          res,
          400,
          `Invalid Classification,Only Allowed: ${classificationArray.toString()}`
        );
      }
    }

    const conflict = await Holiday.findOne({
      _id: { $ne: id },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    });

    if (conflict) {
      return response(
        res,
        409,
        "Another holiday exists in this date range. Update denied."
      );
    }

    holiday.name = name || holiday.name;
    holiday.fromDate = from;
    holiday.toDate = to;
    holiday.classification =
      classification?.toLowerCase() || holiday.classification;

    await holiday.save();
    response(res, 200, "Holiday updated successfully", holiday);
  } catch (error) {
    response(res, 500, "Internal Server error");
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return response(res, 400, "ID is required");
    }

    if (!mongoose.isValidObjectId(id)) {
      return response(res, 400, `Invalid ID: ${id}`);
    }

    const deletedHoliday = await Holiday.findByIdAndDelete(id);

    if (!deletedHoliday) {
      return response(res, 404, "Holiday Not found");
    }

    response(res, 200, "Holiday deleted successfully", deletedHoliday);
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};

export const getAllHolidays = async (req, res) => {
  try {
    const { year } = req.query;

    let query = {};

    if (year) {
      const startYear = dayjs(`${year}-01-01`).startOf("day").toDate();
      const endYear = dayjs(`${year}-12-31`).startOf("day").toDate();

      query = {
        fromDate: { $gte: startYear },
        toDate: { $lte: endYear },
      };
    }

    const holidays = await Holiday.find(query).sort({ formDate: 1 });
    response(res, 200, "Fetched all holidays", holidays);
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};
