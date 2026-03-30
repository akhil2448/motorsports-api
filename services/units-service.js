require("../src/config/env");
const pool = require("../db/pool");

async function getUpcomingUnits(limit = 20) {
  const result = await pool.query(
    `
    SELECT *
    FROM units_view
    WHERE start_time IS NOT NULL
    AND start_time > NOW()
    ORDER BY start_time
    LIMIT $1
    `,
    [limit],
  );

  return result.rows;
}

async function getNextUnit() {
  const result = await pool.query(`
    SELECT *,
    ROUND(EXTRACT(EPOCH FROM (start_time - NOW())) / 60)::INT AS starts_in_minutes
    FROM units_view
    WHERE start_time IS NOT NULL
    AND start_time > NOW()
    ORDER BY start_time
    LIMIT 1
  `);

  return result.rows[0];
}

async function getLiveUnits() {
  const result = await pool.query(`
    SELECT *
    FROM units_view
    WHERE start_time <= NOW()
    AND end_time >= NOW()
    ORDER BY start_time
  `);

  return result.rows;
}

async function getEventSchedule(eventId) {
  const result = await pool.query(
    `
    SELECT DISTINCT ON (unit_id)
      unit_id,
      unit_type,
      name,
      start_time,
      end_time
    FROM units_view
    WHERE event_id = $1
    AND start_time IS NOT NULL
    ORDER BY unit_id, LENGTH(name) DESC
    `,
    [eventId],
  );

  return result.rows.sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time),
  );
}

module.exports = {
  getUpcomingUnits,
  getNextUnit,
  getLiveUnits,
  getEventSchedule,
};
