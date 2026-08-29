const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

const LOW_STOCK_THRESHOLD = 10;

const TIERS_JSON_AGG = `
  COALESCE(
    json_agg(
      json_build_object('min_quantity', pt.min_quantity, 'unit_price', pt.unit_price)
      ORDER BY pt.min_quantity
    ) FILTER (WHERE pt.id IS NOT NULL), '[]'
  ) AS price_tiers
`;

const SORT_COLUMNS = {
  newest: "p.created_at DESC",
  price_asc: "p.unit_price ASC",
  price_desc: "p.unit_price DESC",
  name: "p.name ASC",
};

async function listProducts({ search, category, page = 1, limit = 20, sort = "newest" } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`p.category = $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await pool.query(`SELECT COUNT(*) FROM products p ${whereClause}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const offset = (page - 1) * limit;
  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT p.*, ${TIERS_JSON_AGG}
     FROM products p
     LEFT JOIN product_price_tiers pt ON pt.product_id = p.id
     ${whereClause}
     GROUP BY p.id
     ORDER BY ${SORT_COLUMNS[sort] || SORT_COLUMNS.newest}
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    products: rows,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function listCategories() {
  const { rows } = await pool.query(
    "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category"
  );
  return rows.map((r) => r.category);
}

async function getProduct(id) {
  const { rows } = await pool.query(
    `SELECT p.*, ${TIERS_JSON_AGG}
     FROM products p
     LEFT JOIN product_price_tiers pt ON pt.product_id = p.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );
  if (!rows.length) throw new ApiError(404, "Product not found");
  return rows[0];
}

async function replacePriceTiers(client, productId, tiers) {
  await client.query("DELETE FROM product_price_tiers WHERE product_id = $1", [productId]);
  if (!tiers || !tiers.length) return;

  const valuePlaceholders = [];
  const params = [];
  let idx = 1;
  for (const tier of tiers) {
    valuePlaceholders.push(`($${idx++}, $${idx++}, $${idx++})`);
    params.push(productId, tier.min_quantity, tier.unit_price);
  }
  await client.query(
    `INSERT INTO product_price_tiers (product_id, min_quantity, unit_price) VALUES ${valuePlaceholders.join(", ")}`,
    params
  );
}

async function createProduct(data) {
  const { name, description, category, unit_price, stock_quantity, image_url, price_tiers } = data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO products (name, description, category, unit_price, stock_quantity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, category || null, unit_price, stock_quantity ?? 0, image_url || null]
    );
    const product = rows[0];
    await replacePriceTiers(client, product.id, price_tiers);
    await client.query("COMMIT");
    return getProduct(product.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateProduct(id, data) {
  const {
    name = null,
    description = null,
    category = null,
    unit_price = null,
    stock_quantity = null,
    image_url = null,
    price_tiers,
  } = data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE products SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         unit_price = COALESCE($4, unit_price),
         stock_quantity = COALESCE($5, stock_quantity),
         image_url = COALESCE($6, image_url),
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, description, category, unit_price, stock_quantity, image_url, id]
    );

    if (!rows.length) throw new ApiError(404, "Product not found");

    if (price_tiers !== undefined) {
      await replacePriceTiers(client, id, price_tiers);
    }

    await client.query("COMMIT");
    return getProduct(id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function deleteProduct(id) {
  const { rows } = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  if (!rows.length) throw new ApiError(404, "Product not found");
}

async function getLowStockProducts(threshold = LOW_STOCK_THRESHOLD) {
  const { rows } = await pool.query(
    "SELECT id, name, stock_quantity FROM products WHERE stock_quantity < $1 ORDER BY stock_quantity ASC",
    [threshold]
  );
  return rows;
}

async function bulkCreateProducts(rows) {
  const created = [];
  const failed = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const product = await createProduct(rows[i]);
      created.push(product.id);
    } catch (err) {
      failed.push({ row: i + 1, error: err.message });
    }
  }
  return { createdCount: created.length, failed };
}

module.exports = {
  listProducts,
  listCategories,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  bulkCreateProducts,
  LOW_STOCK_THRESHOLD,
};
