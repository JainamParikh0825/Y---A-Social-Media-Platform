import Notification from "../models/notification.model.js";
import User from "../models/User.model.js";
import {
  render400Error,
  render404Error,
  render500Error,
} from "../utils/error.js";
import { render200Success } from "../utils/success.js";
import { v2 as cloudinary } from "cloudinary";
import bcrypt from "bcryptjs";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return render404Error(res, "User not found");
    }

    return render200Success(res, null, user);
  } catch (error) {
    console.error(`Error in getUserProfile method: ${error.message}`);
    return render500Error(res);
  }
};

export const getSuggestedUsers = async (req, res) => {
  const userId = req.user._id;

  try {
    const userFollowedByMe = await User.findById(userId).select("following");
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      {
        $sample: { size: 10 },
      },
    ]);

    const filteredUsers = users.filter(
      (user) => !userFollowedByMe.following.includes(user._id)
    );
    const suggestedUsers = filteredUsers.slice(0, 4);

    suggestedUsers.forEach((user) => (user.password = null));

    render200Success(res, null, suggestedUsers);
  } catch (error) {
    console.error(`Error in getSuggestedUsers method: ${error.message}`);
    return render500Error(res);
  }
};

export const followUnfollowUser = async (req, res) => {
  const { id } = req.params;

  try {
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (id === req.user._id.toString())
      return render400Error(res, "You can't follow/unfollow yourself!");
    if (!userToModify || !currentUser)
      return render400Error(res, "User not found!");

    const isFollowing = currentUser.following.includes(id);
    if (isFollowing) {
      // unfollow the usera
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
      render200Success(res, "User unfollowed successfully!");
    } else {
      // follow the user
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

      // send notification
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify?._id,
      });
      await newNotification.save();

      render200Success(res, "User followed successfully!");
    }
  } catch (error) {
    console.error(`Error in getUserProfile method: ${error.message}`);
    return render500Error(res);
  }
};

export const updateUser = async (req, res) => {
  const { fullname, email, username, currentPassword, newPassword, bio, link } =
    req.body;
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) return render404Error(res, "User not found!");

    if (
      (!newPassword && currentPassword) ||
      (!currentPassword && newPassword)
    ) {
      return render400Error(
        res,
        "Please provide both current password and new password!"
      );
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return render400Error(res, "Current password is incorrect!");
      if (newPassword.length < 6) {
        return render400Error(
          res,
          "Password must be at least 6 characters long!"
        );
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (profileImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(
          user.profileImg.split("/").pop().split(".")[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(
          user.coverImg.split("/").pop().split(".")[0]
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url;
    }

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    user = await user.save();
    user.password = null;

    return render200Success(res, "User profile updated successfully!", user);
  } catch (error) {
    console.error(`Error in updateUser method: ${error.message}`);
    return render500Error(res);
  }
};
