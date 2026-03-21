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
    SELECT
      e.id,
      e.event_name,
      e.location,
      e.country,
      e.start_date,
      e.end_date,
      e.round_number,
      s.short_name AS series
    FROM events e
    JOIN series s ON e.series_id = s.id
    WHERE e.start_date >= CURRENT_DATE
    ORDER BY e.start_date
    LIMIT 20
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
