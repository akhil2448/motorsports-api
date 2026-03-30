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
  const units = await pool.query(
    `
    SELECT unit_id, unit_type, name, start_time, end_time
    FROM units_view
    WHERE event_id = $1
    `,
    [eventId],
  );

  const stages = await pool.query(
    `
    SELECT
      id AS unit_id,
      'stage' AS unit_type,
      stage_name AS name,
      start_time_utc AS start_time,
      start_time_utc AS end_time
    FROM stages
    WHERE event_id = $1
    `,
    [eventId],
  );

  // ✅ merge + dedupe + sort
  const all = [...units.rows, ...stages.rows];

  return all
    .filter((u) => u.start_time)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

module.exports = {
  getUpcomingUnits,
  getNextUnit,
  getLiveUnits,
  getEventSchedule,
};
