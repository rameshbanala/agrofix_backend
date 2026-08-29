const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

const ITEMS_JSON_AGG = `
  COALESCE(
    json_agg(
      json_build_object(
        'product_id', oi.product_id,
        'name', p.name,
        'image_url', p.image_url,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ) ORDER BY oi.product_id
    ) FILTER (WHERE oi.product_id IS NOT NULL), '[]'
  ) AS items
`;

async function placeOrder(buyerId, { delivery_address, items }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productIds = items.map((item) => item.product_id);
    // Lock the involved product rows for the duration of the transaction so
    // two concurrent orders can't both read the same stock_quantity and
    // both succeed, oversubscribing stock.
    const { rows: products } = await client.query(
      "SELECT id, unit_price, stock_quantity FROM products WHERE id = ANY($1::int[]) FOR UPDATE",
      [productIds]
    );
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productById.get(item.product_id);
      if (!product) throw new ApiError(400, `Product ${item.product_id} does not exist`);
      if (product.stock_quantity < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product ${item.product_id}`);
      }
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (buyer_id, delivery_address) VALUES ($1, $2) RETURNING id`,
      [buyerId, delivery_address]
    );
    const orderId = orderRows[0].id;

    const valuePlaceholders = [];
    const insertParams = [];
    let paramIndex = 1;
    for (const item of items) {
      const product = productById.get(item.product_id);
      valuePlaceholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      insertParams.push(orderId, item.product_id, item.quantity, product.unit_price);
    }
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ${valuePlaceholders.join(", ")}`,
      insertParams
    );

    for (const item of items) {
      await client.query("UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2", [
        item.quantity,
        item.product_id,
      ]);
    }

    await client.query("COMMIT");
    return orderId;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to place order");
  } finally {
    client.release();
  }
}

async function getOrdersForBuyer(buyerId) {
  const { rows } = await pool.query(
    `SELECT o.*, ${ITEMS_JSON_AGG}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.buyer_id = $1
     GROUP BY o.id
     ORDER BY o.placed_at DESC`,
    [buyerId]
  );
  return rows;
}

async function getOrderForBuyer(orderId, buyerId) {
  const { rows } = await pool.query(
    `SELECT o.*, ${ITEMS_JSON_AGG}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE o.id = $1 AND o.buyer_id = $2
     GROUP BY o.id`,
    [orderId, buyerId]
  );
  if (!rows.length) throw new ApiError(404, "Order not found");
  return rows[0];
}

async function getAllOrdersAdmin() {
  const { rows } = await pool.query(
    `SELECT o.*, u.name AS buyer_name, ${ITEMS_JSON_AGG}
     FROM orders o
     JOIN users u ON o.buyer_id = u.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     GROUP BY o.id, u.name
     ORDER BY o.placed_at DESC`
  );
  return rows;
}

async function cancelOrder(orderId, buyerId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT * FROM orders WHERE id = $1 AND buyer_id = $2 FOR UPDATE",
      [orderId, buyerId]
    );
    if (!rows.length) throw new ApiError(404, "Order not found");

    const order = rows[0];
    if (!["pending", "in_progress"].includes(order.status)) {
      throw new ApiError(400, "Order cannot be cancelled");
    }

    const { rows: items } = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      [orderId]
    );
    for (const item of items) {
      await client.query("UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2", [
        item.quantity,
        item.product_id,
      ]);
    }

    await client.query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [
      orderId,
    ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to cancel order");
  } finally {
    client.release();
  }
}

async function updateOrderStatus(orderId, status) {
  const { rows } = await pool.query(
    "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, orderId]
  );
  if (!rows.length) throw new ApiError(404, "Order not found");
  return rows[0];
}

module.exports = {
  placeOrder,
  getOrdersForBuyer,
  getOrderForBuyer,
  getAllOrdersAdmin,
  cancelOrder,
  updateOrderStatus,
};
