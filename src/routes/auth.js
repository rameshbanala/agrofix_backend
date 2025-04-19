const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

    res
      .status(201)
      .json({ message: "Admin created", admin: result.rows[0].json() });
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

module.exports = router;
