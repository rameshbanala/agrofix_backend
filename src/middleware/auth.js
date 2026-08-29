const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, env.jwt.secret);
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Session expired, please log in again"
        : "Invalid token";
    return res.status(401).json({ error: message });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
}

module.exports = { authenticate, authorizeAdmin };
