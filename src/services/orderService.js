const pool = require("../config/db");
const ApiError = require("../utils/ApiError");
const { sendEmail } = require("../utils/sendEmail");

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

const HISTORY_JSON_AGG_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(
       json_build_object('status', h.status, 'changed_at', h.changed_at)
       ORDER BY h.changed_at
     )
     FROM order_status_history h WHERE h.order_id = o.id), '[]'
  ) AS status_history
`;

// Picks the best-matching bulk price tier for a requested quantity, falling
// back to the product's base unit_price when no tier qualifies.
function resolveUnitPrice(product, tiers, quantity) {
  const applicable = tiers
    .filter((t) => t.product_id === product.id && quantity >= t.min_quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity);
  return applicable.length ? applicable[0].unit_price : product.unit_price;
}

async function recordStatusHistory(client, orderId, status) {
  await client.query("INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)", [
    orderId,
    status,
  ]);
}

async function notifyBuyerOfStatusChange(orderId, status) {
  try {
    const { rows } = await pool.query(
      `SELECT u.email, u.name, o.id FROM orders o JOIN users u ON u.id = o.buyer_id WHERE o.id = $1`,
      [orderId]
    );
    if (!rows.length) return;
    const { email, name } = rows[0];
    const readableStatus = status.replace("_", " ");
    await sendEmail({
      email,
      subject: `Your AgroFix order #${orderId} is now ${readableStatus}`,
      html: `
        <p>Hello ${name},</p>
        <p>Your order <strong>#${orderId}</strong> status has been updated to <strong>${readableStatus}</strong>.</p>
        <p>Thank you,<br>AgroFix Team</p>
      `,
    });
  } catch (err) {
    // Best-effort — a failed notification email should never fail the
    // status update itself.
    console.error(`Failed to send status-change email for order ${orderId}:`, err.message);
  }
}

async function placeOrder(buyerId, { delivery_address, items }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productIds = items.map((item) => item.product_id);
    const { rows: products } = await client.query(
      "SELECT id, unit_price, stock_quantity FROM products WHERE id = ANY($1::int[]) FOR UPDATE",
      [productIds]
    );
    const productById = new Map(products.map((p) => [p.id, p]));

    const { rows: tiers } = await client.query(
      "SELECT product_id, min_quantity, unit_price FROM product_price_tiers WHERE product_id = ANY($1::int[])",
      [productIds]
    );

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
      const unitPrice = resolveUnitPrice(product, tiers, item.quantity);
      valuePlaceholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      insertParams.push(orderId, item.product_id, item.quantity, unitPrice);
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

    await recordStatusHistory(client, orderId, "pending");

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
    `SELECT o.*, ${ITEMS_JSON_AGG}, ${HISTORY_JSON_AGG_SUBQUERY}
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
    `SELECT o.*, ${ITEMS_JSON_AGG}, ${HISTORY_JSON_AGG_SUBQUERY}
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
    `SELECT o.*, u.name AS buyer_name, ${ITEMS_JSON_AGG}, ${HISTORY_JSON_AGG_SUBQUERY}
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
    await recordStatusHistory(client, orderId, "cancelled");

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to cancel order");
  } finally {
    client.release();
  }

  // Fire-and-forget: notification delivery is best-effort and even with the
  // send-timeout in sendEmail.js there's no reason to make the caller wait
  // on it at all.
  notifyBuyerOfStatusChange(orderId, "cancelled");
}

async function updateOrderStatus(orderId, status) {
  const client = await pool.connect();
  let updated;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, orderId]
    );
    if (!rows.length) throw new ApiError(404, "Order not found");
    updated = rows[0];
    await recordStatusHistory(client, orderId, status);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to update order status");
  } finally {
    client.release();
  }

  notifyBuyerOfStatusChange(orderId, status);
  return updated;
}

module.exports = {
  placeOrder,
  getOrdersForBuyer,
  getOrderForBuyer,
  getAllOrdersAdmin,
  cancelOrder,
  updateOrderStatus,
  resolveUnitPrice,
};
