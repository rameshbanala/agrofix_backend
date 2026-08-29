const express = require("express");
const router = express.Router();

const { authenticate, authorizeAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiters");
const controller = require("../controllers/authController");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authValidators");

router.post("/signup", authLimiter, validate(signupSchema), controller.signup);

// Creating an admin requires an existing admin's token — this used to be a
// wide-open, unauthenticated endpoint.
router.post(
  "/admin/signup",
  authenticate,
  authorizeAdmin,
  validate(signupSchema),
  controller.createAdmin
);

router.post("/login", authLimiter, validate(loginSchema), controller.login);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword
);

module.exports = router;
