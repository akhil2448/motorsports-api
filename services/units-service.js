require("../src/config/env");
const { getFallbackEndTime } = require("../utils/fallbackDuration");
const { getStatus } = require("../utils/status"); // ✅ ADD THIS
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
    SELECT 
      u.unit_id,
      u.unit_type,
      u.name,
      u.start_time,
      u.end_time,
      u.phase,
      e.event_name,
      s.short_name AS series
    FROM units_view u
    JOIN events e ON u.event_id = e.id
    JOIN series s ON e.series_id = s.id
    WHERE u.event_id = $1
    AND u.start_time IS NOT NULL
    ORDER BY u.start_time
    `,
    [eventId],
  );

  const rows = result.rows;

  const now = new Date();

  return rows.map((row) => {
    const start = new Date(row.start_time);
    let end = row.end_time ? new Date(row.end_time) : null;

    // ✅ APPLY FALLBACK (same as calendar)
    if (!end) {
      const fallbackEnd = getFallbackEndTime({
        series: row.series,
        session: {
          name: row.name,
          session_type: row.unit_type,
          start_time_utc: start,
        },
        event: {
          name: row.event_name,
          sessions: rows.map((r) => ({
            session_type: r.unit_type,
          })),
        },
      });

      if (fallbackEnd) end = fallbackEnd;
    }

    let status;

    if (start > now) {
      status = "upcoming";
    } else if (end && start <= now && end >= now) {
      status = "live";
    } else {
      status = "completed";
    }

    return {
      unit_id: row.unit_id,
      name: row.name,
      start_time: start,
      end_time: end,
      phase: row.phase || null,
      status, // ✅ THIS FIXES EVERYTHING
    };
  });
}

module.exports = {
  getUpcomingUnits,
  getNextUnit,
  getLiveUnits,
  getEventSchedule,
};
