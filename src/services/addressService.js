const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

async function listAddresses(userId) {
  const { rows } = await pool.query(
    "SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC",
    [userId]
  );
  return rows;
}

async function createAddress(userId, { label, address_text, is_default }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (is_default) {
      await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
    }
    const { rows } = await client.query(
      `INSERT INTO addresses (user_id, label, address_text, is_default)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, label, address_text, is_default]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function deleteAddress(userId, addressId) {
  const { rows } = await pool.query(
    "DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id",
    [addressId, userId]
  );
  if (!rows.length) throw new ApiError(404, "Address not found");
}

async function setDefaultAddress(userId, addressId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
    const { rows } = await client.query(
      "UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [addressId, userId]
    );
    if (!rows.length) throw new ApiError(404, "Address not found");
    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listAddresses, createAddress, deleteAddress, setDefaultAddress };
