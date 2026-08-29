const pool = require("../config/db");
const ApiError = require("../utils/ApiError");

async function listUsers() {
  // Note: users has no created_at column in the current schema, so we order
  // by id (roughly chronological, since it's a serial primary key) instead.
  const { rows } = await pool.query(
    "SELECT id, name, email, role, contact FROM users ORDER BY id DESC"
  );
  return rows;
}

async function setUserRole(userId, role, requestingAdminId) {
  if (Number(userId) === Number(requestingAdminId)) {
    throw new ApiError(400, "You cannot change your own role");
  }
  const { rows } = await pool.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, contact",
    [role, userId]
  );
  if (!rows.length) throw new ApiError(404, "User not found");
  return rows[0];
}

module.exports = { listUsers, setUserRole };
