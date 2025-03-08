import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import {
  render401Error,
  render404Error,
  render500Error,
} from "../utils/error.js";

export const protectedRoute = async (req, res, next) => {
  try {
    const token = req.cookies["token"];
    if (!token) {
      return render401Error(res, "Unauthenticated user!");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return render401Error(res, "Unauthorised: Invalid Token!");
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return render404Error(res, "User not found!");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(`Error in protectedRoute method: ${error.message}`);
    return render500Error(res);
  }
};
