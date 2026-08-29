const ApiError = require("../utils/ApiError");

function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
    return res.status(400).json({ error: message });
  }
  if (err.message && /only .*(images|csv).* are allowed/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }

  // Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  if (err.code === "23505") {
    return res.status(409).json({ error: "Resource already exists" });
  }
  if (err.code === "23503") {
    return res
      .status(409)
      .json({ error: "This item is referenced by other records and cannot be modified" });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };
