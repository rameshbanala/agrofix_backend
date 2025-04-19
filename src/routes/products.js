// routes/products.js
const express = require("express");
const pool = require("../db/db");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/auth");

// GET: Fetch all products (Public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});
// GET: Fetch a single product by ID (Admin only, or public if you want)
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST: Create a product (Admin only)
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, description, unit_price, stock_quantity, image_url } =
      req.body;
    if (!name || !unit_price)
      return res
        .status(400)
        .json({ error: "Name and unit price are required" });

    const result = await pool.query(
      `INSERT INTO products (name, description, unit_price, stock_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, unit_price, stock_quantity || 0, image_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Product creation failed" });
  }
});

// PUT: Update a product (Admin only)
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name = null,
      description = null,
      unit_price = null,
      stock_quantity = null,
      image_url = null,
    } = req.body;
    if (!id) throw new Error("Product ID is required");
    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        unit_price = COALESCE($3, unit_price),
        stock_quantity = COALESCE($4, stock_quantity),
        image_url = COALESCE($5, image_url),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, description, unit_price, stock_quantity, image_url, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Product update failed" });
  }
});

// DELETE: Remove a product (Admin only)
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch {
    res.status(500).json({ error: "Product deletion failed" });
  }
});

module.exports = router;
