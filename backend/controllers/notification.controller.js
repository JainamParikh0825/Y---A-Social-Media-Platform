import Notification from "../models/notification.model.js";
import { render200Success } from "../utils/success.js";

export const getNotifications = async (req, res) => {
  const userId = req.user._id;
  try {
    const notifications = await Notification.find({ to: userId }).populate({
      path: "from",
      select: "username profileImg",
    });

    await Notification.updateMany({ to: userId }, { read: true });

    render200Success(res, null, notifications);
  } catch (error) {
    console.error(`Error in getNotifications method: ${error.message}`);
    return render500Error(res);
  }
};

export const deleteNotifications = async (req, res) => {
  const userId = req.user._id;
  try {
    await Notification.deleteMany({ to: userId });

    render200Success(res, "Notifications deleted successfully!");
  } catch (error) {
    console.error(`Error in deleteNotifications method: ${error.message}`);
    return render500Error(res);
  }
};
