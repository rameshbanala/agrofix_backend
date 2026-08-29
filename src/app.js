const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const env = require("./config/env");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (curl, server-to-server, health checks).
      if (!origin || env.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
