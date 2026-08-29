require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,

  db: {
    host: required("DB_HOST"),
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    // Neon and most managed Postgres providers use certificates that aren't
    // in Node's default trust store, so this stays opt-in via env rather
    // than defaulting to a stricter setting that could break an existing
    // deployment without warning. Set DB_SSL_REJECT_UNAUTHORIZED=true once
    // you've verified your provider's CA chain validates.
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
    // Defaults to true (required in production against Neon). Set
    // DB_SSL=false only for a local Postgres instance that doesn't speak TLS.
    ssl: process.env.DB_SSL !== "false",
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.TOKEN_EXPIRY || "1d",
  },

  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME || "AgroFix",
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

env.cloudinary.configured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (!env.email.user || !env.email.password) {
  console.warn(
    "EMAIL_USER/EMAIL_PASSWORD are not set — password reset emails will fail to send."
  );
}

if (!env.cloudinary.configured) {
  console.warn(
    "CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET are not set — " +
      "image upload will be disabled (products can still use a manual image URL)."
  );
}

module.exports = env;
