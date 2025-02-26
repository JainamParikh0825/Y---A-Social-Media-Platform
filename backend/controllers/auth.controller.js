import User from "../models/User.model.js";
import { render400Error, render500Error } from "../utils/error.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/jwt.js";
import { render200Success, render201Success } from "../utils/success.js";

export const signup = async (req, res) => {
  try {
    const { fullname, username, email, password } = req.body;

    const { invalid, errorObj } = await signupDataValidations(req.body, res);
    if (invalid) return errorObj;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      await newUser.save();

      return render201Success(res, "Signed up successfully!", {
        _id: newUser._id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
        followers: newUser.followers,
        following: newUser.following,
        profileImg: newUser.profileImg,
        coverImg: newUser.coverImg,
      });
    } else {
      return render400Error(res, "Invalid user data!");
    }
  } catch (error) {
    console.error(`Error in signup method: ${error.message}`);
    return render500Error(res);
  }
};

export const login = async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });

    const { invalid, errorObj } = await loginValidations(req.body, user, res);
    if (invalid) return errorObj;

    generateTokenAndSetCookie(user._id, res);

    return render200Success(res, "Logged in successfully!", {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      followers: user.followers,
      following: user.following,
      profileImg: user.profileImg,
      coverImg: user.coverImg,
    });
  } catch (error) {
    console.error(`Error in login method: ${error.message}`);
    return render500Error(res);
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    return render200Success(res, "Logged out successfully!", null);
  } catch (error) {
    console.error(`Error in logout method: ${error.message}`);
    return render500Error(res);
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    return render200Success(res, null, user);
  } catch (error) {
    console.error(`Error in getMe method: ${error.message}`);
    return render500Error(res);
  }
};

const signupDataValidations = async (
  { username, email, fullname, password },
  res
) => {
  if (!username || !email || !fullname || !password) {
    return {
      invalid: true,
      errorObj: render400Error(res, "Fields are mandatory!"),
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      invalid: true,
      errorObj: render400Error(res, "Invalid email format!"),
    };
  }

  if (password.length < 6) {
    return {
      invalid: true,
      errorObj: render400Error(
        res,
        "Password must be at least 6 characters long!"
      ),
    };
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return {
      invalid: true,
      errorObj: render400Error(res, "Username is already taken!"),
    };
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return {
      invalid: true,
      errorObj: render400Error(res, "Email is already taken!"),
    };
  }

  return { invalid: false, errorObj: null };
};

const loginValidations = async ({ password }, user, res) => {
  const isPasswordValid = await bcrypt.compare(password, user?.password || "");

  if (!user || !isPasswordValid) {
    return {
      invalid: true,
      errorObj: render400Error(res, "Invalid username or password!"),
    };
  }

  return { invalid: false, errorObj: null };
};
