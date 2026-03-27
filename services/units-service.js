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
  // try units_view first
  const result = await pool.query(
    `
    SELECT unit_id, unit_type, name, start_time, end_time
    FROM units_view
    WHERE event_id = $1
    ORDER BY start_time
    `,
    [eventId],
  );

  if (result.rows.length > 0) {
    return result.rows;
  }

  // 🔥 fallback → sessions
  const sessions = await pool.query(
    `
    SELECT
      id AS unit_id,
      session_type AS unit_type,
      session_name AS name,
      start_time_utc AS start_time,
      end_time_utc AS end_time
    FROM sessions
    WHERE event_id = $1
    ORDER BY start_time_utc
    `,
    [eventId],
  );

  if (sessions.rows.length > 0) {
    return sessions.rows;
  }

  // 🔥 fallback → stages (WRC)
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
    ORDER BY start_time_utc
    `,
    [eventId],
  );

  return stages.rows;
}

module.exports = {
  getUpcomingUnits,
  getNextUnit,
  getLiveUnits,
  getEventSchedule,
};
