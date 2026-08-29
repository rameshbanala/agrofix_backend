const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

async function listProducts() {
  const { rows } = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
  return rows;
}

async function getProduct(id) {
  const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
  if (!rows.length) throw new ApiError(404, "Product not found");
  return rows[0];
}

async function createProduct(data) {
  const { name, description, unit_price, stock_quantity, image_url } = data;
  const { rows } = await pool.query(
    `INSERT INTO products (name, description, unit_price, stock_quantity, image_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description || null, unit_price, stock_quantity ?? 0, image_url || null]
  );
  return rows[0];
}

async function updateProduct(id, data) {
  const {
    name = null,
    description = null,
    unit_price = null,
    stock_quantity = null,
    image_url = null,
  } = data;

  const { rows } = await pool.query(
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

  if (!rows.length) throw new ApiError(404, "Product not found");
  return rows[0];
}

async function deleteProduct(id) {
  const { rows } = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  if (!rows.length) throw new ApiError(404, "Product not found");
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
