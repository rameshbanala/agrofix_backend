const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

const signup = asyncHandler(async (req, res) => {
  const user = await authService.signup(req.body);
  res.status(201).json({ message: "Signup successful", user });
});

const createAdmin = asyncHandler(async (req, res) => {
  const admin = await authService.createAdmin(req.body);
  res.status(201).json({ message: "Admin created", admin });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res.json({ message: "If that email is registered, a reset link has been sent." });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.json({ message: "Password reset successful" });
});

module.exports = { signup, createAdmin, login, forgotPassword, resetPassword };
