const express = require("express");
const pool = require("../db/db");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/auth");

// POST: Buyer places a new order
router.post("/", authenticate, async (req, res) => {
  const { delivery_address, items } = req.body;
  const buyer_id = req.user.id;

  if (!delivery_address || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "Address and items required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `INSERT INTO orders (buyer_id, delivery_address)
       VALUES ($1, $2) RETURNING id`,
      [buyer_id, delivery_address]
    );
    const orderId = orderRes.rows[0].id;

    for (let item of items) {
      const product = await client.query(
        `SELECT unit_price, stock_quantity FROM products WHERE id = $1`,
        [item.product_id]
      );
      if (!product.rows.length) throw new Error("Invalid product ID");
      if (product.rows[0].stock_quantity < item.quantity)
        throw new Error("Insufficient stock");

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, product.rows[0].unit_price]
      );

      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ order_id: orderId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message || "Order failed" });
  } finally {
    client.release();
  }
});

// GET: Buyer views all their orders (with items and product details)
router.get("/", authenticate, async (req, res) => {
  // Only allow non-admins to use this endpoint
  if (req.user.role === "admin") {
    return res.status(403).json({ error: "Admins cannot use this endpoint" });
  }

  try {
    const ordersRes = await pool.query(
      `SELECT * FROM orders WHERE buyer_id = $1 ORDER BY placed_at DESC`,
      [req.user.id]
    );
    const orders = ordersRes.rows;

    const ordersWithItems = [];
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.*, p.name, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items: itemsRes.rows,
      });
    }

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET: Buyer views their specific order (with items and product details)
router.get("/:id", authenticate, async (req, res) => {
  const orderId = req.params.id;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2`,
      [orderId, req.user.id]
    );
    if (!orderRes.rows.length)
      return res.status(404).json({ error: "Order not found" });

    const itemsRes = await pool.query(
      `SELECT oi.*, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.json({ ...orderRes.rows[0], items: itemsRes.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// PUT: Buyer cancels their own order (if pending/in_progress)
router.put("/:id/cancel", authenticate, async (req, res) => {
  const orderId = req.params.id;
  const buyerId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if order belongs to user and is cancellable
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2`,
      [orderId, buyerId]
    );
    if (!orderRes.rows.length)
      return res.status(404).json({ error: "Order not found" });

    const order = orderRes.rows[0];
    if (!["pending", "in_progress"].includes(order.status))
      return res.status(400).json({ error: "Order cannot be cancelled" });

    // Restore stock for each item
    const itemsRes = await client.query(
      `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    for (const item of itemsRes.rows) {
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Update order status
    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query("COMMIT");
    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message || "Failed to cancel order" });
  } finally {
    client.release();
  }
});

// ADMIN ENDPOINTS

// GET: Admin views all orders (with buyer info, items, and product details)
router.get("/admin/orders", authenticate, authorizeAdmin, async (_req, res) => {
  try {
    const ordersRes = await pool.query(`
      SELECT o.*, u.name AS buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ORDER BY o.placed_at DESC
    `);
    const orders = ordersRes.rows;

    const ordersWithItems = [];
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.*, p.name, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items: itemsRes.rows,
      });
    }

    res.json(ordersWithItems);
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// PUT: Admin updates order status
router.put("/:id/status", authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "in_progress", "delivered"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Order not found" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

module.exports = router;
