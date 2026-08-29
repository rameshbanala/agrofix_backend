const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  ssl: {
    require: true,
    rejectUnauthorized: env.db.sslRejectUnauthorized,
  },
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error on idle client:", err);
});

module.exports = pool;
