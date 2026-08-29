const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { sendEmail } = require("../utils/sendEmail");

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] || null;
}

async function signup({ name, email, password, contact }) {
  const existing = await findUserByEmail(email);
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, contact)
     VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, contact`,
    [name, email, passwordHash, contact || null]
  );
  return rows[0];
}

async function createAdmin({ name, email, password, contact }) {
  const existing = await findUserByEmail(email);
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, contact)
     VALUES ($1, $2, $3, 'admin', $4) RETURNING id, name, email, role, contact`,
    [name, email, passwordHash, contact || null]
  );
  return rows[0];
}

async function login({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) throw new ApiError(401, "Invalid credentials");

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, "Invalid credentials");

  const token = jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

  delete user.password_hash;
  delete user.reset_token;
  delete user.reset_token_expiry;

  return { token, user };
}

async function requestPasswordReset(email) {
  const user = await findUserByEmail(email);
  // Deliberately no-op (not a 404) when the account doesn't exist, so the
  // response can't be used to enumerate registered emails.
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);
  const resetTokenExpiry = Date.now() + RESET_TOKEN_TTL_MS;

  await pool.query(
    "UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3",
    [hashedToken, resetTokenExpiry, user.id]
  );

  const resetUrl = `${env.clientUrl}/reset-password?token=${resetToken}&id=${user.id}`;

  await sendEmail({
    email: user.email,
    subject: "Password Reset Request",
    html: `
      <h1>Password Reset Request</h1>
      <p>Hello ${user.name},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background-color:#16a34a;color:white;text-decoration:none;border-radius:6px;margin:15px 0;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>Thank you,<br>AgroFix Team</p>
    `,
  });
}

async function resetPassword({ id, token, password }) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  const user = rows[0];
  if (!user) throw new ApiError(400, "Reset link is invalid or has expired");

  if (!user.reset_token || Date.now() > Number(user.reset_token_expiry)) {
    throw new ApiError(400, "Reset link is invalid or has expired");
  }

  const validToken = await bcrypt.compare(token, user.reset_token);
  if (!validToken) throw new ApiError(400, "Reset link is invalid or has expired");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await pool.query(
    "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2",
    [passwordHash, id]
  );

  await sendEmail({
    email: user.email,
    subject: "Password Reset Successful",
    html: `
      <h1>Password Reset Successful</h1>
      <p>Hello ${user.name},</p>
      <p>Your password has been successfully reset.</p>
      <p>If you didn't perform this action, please contact support immediately.</p>
      <p>Thank you,<br>AgroFix Team</p>
    `,
  });
}

module.exports = {
  signup,
  createAdmin,
  login,
  requestPasswordReset,
  resetPassword,
};
