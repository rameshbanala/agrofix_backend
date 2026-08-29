const rateLimit = require("express-rate-limit");

// Throttles auth endpoints (login, signup, forgot/reset password) to slow
// down brute-force and credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

module.exports = { authLimiter };
