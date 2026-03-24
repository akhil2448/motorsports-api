const { Pool } = require("pg");
require("dotenv").config({
  path:
    process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ✅ ADD THIS HERE
console.log(
  "Using DB:",
  process.env.DATABASE_URL.includes("localhost") ? "LOCAL" : "NEON",
);

module.exports = pool;
