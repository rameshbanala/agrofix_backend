const pool = require("../config/db");
const productService = require("./productService");

async function getSummary() {
  const [revenueRes, statusRes, topProductsRes, trendRes, lowStock] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled'`
    ),
    pool.query(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status`),
    pool.query(
      `SELECT p.id, p.name, SUM(oi.quantity) AS total_quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.status != 'cancelled'
       GROUP BY p.id, p.name
       ORDER BY total_quantity DESC
       LIMIT 5`
    ),
    pool.query(
      `SELECT date_trunc('day', o.placed_at)::date AS day,
              COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS revenue
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.placed_at >= NOW() - INTERVAL '14 days' AND o.status != 'cancelled'
       GROUP BY day
       ORDER BY day`
    ),
    productService.getLowStockProducts(),
  ]);

  return {
    totalRevenue: Number(revenueRes.rows[0].total_revenue),
    totalOrders: statusRes.rows.reduce((sum, r) => sum + Number(r.count), 0),
    ordersByStatus: statusRes.rows.reduce((acc, r) => ({ ...acc, [r.status]: Number(r.count) }), {}),
    topProducts: topProductsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      totalQuantity: Number(r.total_quantity),
    })),
    revenueTrend: trendRes.rows.map((r) => ({ day: r.day, revenue: Number(r.revenue) })),
    lowStockProducts: lowStock,
    lowStockThreshold: productService.LOW_STOCK_THRESHOLD,
  };
}

module.exports = { getSummary };
