require("../src/config/env");
const pool = require("../db/pool");

async function getCalendar(days = 7) {
  const result = await pool.query(
    `
    SELECT *,
    CASE
      WHEN start_time > NOW() THEN 'upcoming'
      WHEN start_time <= NOW() AND end_time >= NOW() THEN 'live'
      ELSE 'completed'
    END AS status
    FROM units_view
    WHERE start_time >= NOW()
    AND start_time <= NOW() + ($1 * INTERVAL '1 day')
    ORDER BY start_time
    `,
    [days],
  );

  return result.rows;
}

async function getLiveCalendar() {
  const result = await pool.query(`
    SELECT *
    FROM units_view
    WHERE start_time <= NOW()
    AND end_time >= NOW()
    ORDER BY start_time
  `);

  return result.rows;
}

module.exports = {
  getCalendar,
  getLiveCalendar,
};
