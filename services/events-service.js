require("../src/config/env");
const pool = require("../db/pool");

async function getEventsByYear(year) {
  const result = await pool.query(
    `
    SELECT *
    FROM events
    WHERE start_date >= $1
    AND start_date < $2
    ORDER BY round_number
    `,
    [`${year}-01-01`, `${Number(year) + 1}-01-01`],
  );

  return result.rows;
}

async function getUpcomingEvents() {
  const result = await pool.query(`
    WITH event_times AS (
      SELECT
        e.id,
        e.event_name,
        e.location,
        e.country,
        e.round_number,
        e.series_id,
        s.short_name AS series,

        -- ✅ fallback to event dates if no sessions
        COALESCE(
          MIN(COALESCE(u.start_time, se.start_time_utc)),
          e.start_date::timestamptz
        ) AS event_start,

        COALESCE(
          MAX(COALESCE(u.end_time, se.end_time_utc)),
          e.end_date::timestamptz
        ) AS event_end

      FROM events e
      JOIN series s ON e.series_id = s.id

      LEFT JOIN units_view u ON u.event_id = e.id
      LEFT JOIN sessions se ON se.event_id = e.id

      GROUP BY e.id, s.short_name
    ),

    ranked_events AS (
      SELECT *,
        CASE
          WHEN NOW() < event_start THEN 1
          WHEN NOW() BETWEEN event_start AND event_end THEN 2
          ELSE 3
        END AS status_rank
      FROM event_times
    ),

    final_pick AS (
      SELECT DISTINCT ON (series_id)
        id,
        event_name,
        location,
        country,
        round_number,
        series,
        event_start,
        event_end,
        status_rank
      FROM ranked_events
      ORDER BY series_id, status_rank, event_start
    )

    SELECT *
    FROM final_pick
    ORDER BY event_start;
  `);

  return result.rows;
}

async function getEventsBySeries(seriesShortName) {
  const result = await pool.query(
    `
    SELECT
      e.id,
      e.event_name,
      e.location,
      e.country,
      e.start_date,
      e.end_date,
      s.name AS series
    FROM events e
    JOIN series s ON e.series_id = s.id
    WHERE s.short_name = $1
    ORDER BY e.start_date
    `,
    [seriesShortName],
  );

  return result.rows;
}

async function getEventById(eventId) {
  const result = await pool.query(
    `
    SELECT
      e.*,
      s.short_name AS series
    FROM events e
    JOIN series s ON e.series_id = s.id
    WHERE e.id = $1
    `,
    [eventId],
  );

  return result.rows[0];
}

module.exports = {
  getEventsByYear,
  getUpcomingEvents,
  getEventsBySeries,
  getEventById,
};
