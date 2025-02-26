import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

  res.cookie("token", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // milliseconds
    httpOnly: true,
    sameSite: "strict", // CSRF attacks
    secure: process.env.NODE_ENV !== "development",
  });
};
