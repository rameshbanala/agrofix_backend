const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/sendEmail");
const pool = require("../db/db");
require("dotenv").config();

const router = express.Router();

router.post("/admin/signup", async (req, res) => {
  const { name, email, password, contact } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0)
      return res
        .status(400)
        .json({ error: "Admin with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role,contact)
         VALUES ($1, $2, $3, 'admin',$4) RETURNING id, name, email, role`,
      [name, email, hashedPassword, contact]
    );

    res.status(201).json({ message: "Admin created", admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, contact } = req.body;

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash,contact) VALUES ($1, $2, $3,$4) RETURNING id, name,role,contact",
      [name, email, hash, contact]
    );
    res.status(201).json({ signup: "success", user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: "Signup failed", details: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (!user.rows.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY }
    );
    res.json({ token, user: user.rows[0] });
  } catch (err) {
    res.status(400).json({ error: "Login failed", details: err.message });
  }
});

// Forgot Password - Request reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // Check if user exists
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a random string for reset token
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Hash the token before storing it
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Set token expiry (1 hour from now)
    const resetTokenExpiry = Date.now() + 3600000;

    // Store token in database
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3",
      [hashedToken, resetTokenExpiry, user.rows[0].id]
    );

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&id=${user.rows[0].id}`;

    // Send email with reset link
    await sendEmail({
      email: user.rows[0].email,
      subject: "Password Reset Request",
      html: `
        <h1>Password Reset Request</h1>
        <p>Hello ${user.rows[0].name},</p>
        <p>You requested a password reset. Please click the link below to set a new password:</p>
        <a href="${resetUrl}" style="display:inline-block; padding:12px 20px; background-color:#4285f4; color:white; text-decoration:none; border-radius:5px; margin:15px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p>Thank you,<br>Your App Team</p>
      `,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset Password with token
router.post("/reset-password", async (req, res) => {
  const { id, token, password } = req.body;

  if (!id || !token || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Find user by ID
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if reset token exists and is not expired
    if (
      !user.rows[0].reset_token ||
      Date.now() > user.rows[0].reset_token_expiry
    ) {
      return res
        .status(400)
        .json({ error: "Reset token is invalid or has expired" });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, user.rows[0].reset_token);

    if (!isValidToken) {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2",
      [hashedPassword, id]
    );

    // Send confirmation email
    await sendEmail({
      email: user.rows[0].email,
      subject: "Password Reset Successful",
      html: `
        <h1>Password Reset Successful</h1>
        <p>Hello ${user.rows[0].name},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact our support team immediately.</p>
        <p>Thank you,<br>Your App Team</p>
      `,
    });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
