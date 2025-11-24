import { response } from "../utils/response.js";

const adminHrAndLoggedUser = async (req, res, next) => {
  try {
    const role = req.employee.role;

    if (role === "admin" || role === "hr") {
      return next();
    }

    const loggedInUser = req.employee.id;
    const requestedId = req.params.id;

    if (loggedInUser === requestedId) {
      return next();
    }

    return response(res, 403, "Access Denied: You are not authorized");
  } catch (error) {
    response(res, 500, "Internal Server Error");
  }
};

export default adminHrAndLoggedUser;
