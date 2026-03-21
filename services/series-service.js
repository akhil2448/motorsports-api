require("../src/config/env");
const pool = require("../db/pool");

async function getAllSeries() {
  const result = await pool.query(`
    SELECT *
    FROM series
    ORDER BY id
  `);

  return result.rows;
}

module.exports = {
  getAllSeries,
};
