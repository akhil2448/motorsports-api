require("../src/config/env");
const pool = require("../db/pool");
const { getFallbackEndTime } = require("../utils/fallbackDuration");
const { getStatus } = require("../utils/status");

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
      e.round_number,
      s.short_name AS series,
      e.start_date,
      e.end_date,
      u.start_time,
      u.end_time,
      u.name,
      u.unit_type,
      u.phase
    FROM events e
    JOIN series s ON e.series_id = s.id
    LEFT JOIN units_view u ON u.event_id = e.id
    ORDER BY e.id, u.start_time;
  `);

  const rows = result.rows;
  const eventsMap = {};
  const now = new Date();

  rows.forEach((row) => {
    if (!eventsMap[row.id]) {
      const endDate = row.end_date ? new Date(row.end_date) : null;

      const startDate = row.start_date
        ? new Date(row.start_date)
        : endDate
          ? new Date(endDate.getTime() - 2 * 86400000) // ✅ fallback
          : null;

      eventsMap[row.id] = {
        id: row.id,
        event_name: row.event_name,
        location: row.location,
        country: row.country,
        round_number: row.round_number,
        series: row.series,
        start_date: startDate,
        end_date: endDate,
        sessions: [],
      };
    }

    if (!row.start_time) return;

    const event = eventsMap[row.id];

    const start = new Date(row.start_time);
    let end = row.end_time ? new Date(row.end_time) : null;

    // ✅ fallback logic (same as calendar)
    if (!end) {
      const fallbackEnd = getFallbackEndTime({
        series: row.series,
        session: {
          name: row.name,
          session_type: row.unit_type,
          start_time_utc: start,
        },
        event,
      });

      if (fallbackEnd) end = fallbackEnd;
    }

    event.sessions.push({
      start,
      end,
      name: row.name,
      phase: row.phase || null, // ✅ CRITICAL
    });
  });

  // ✅ compute event_start / event_end + status
  Object.values(eventsMap).forEach((event) => {
    if (event.sessions.length > 0) {
      event.event_start = new Date(
        Math.min(...event.sessions.map((s) => s.start)),
      );

      event.event_end = new Date(
        Math.max(...event.sessions.map((s) => s.end || s.start)),
      );
    } else {
      event.event_start = event.start_date ? new Date(event.start_date) : null;

      event.event_end = event.end_date ? new Date(event.end_date) : null;
    }

    // ✅ status
    event.status = getStatus({
      start: event.event_start,
      end: event.event_end,
      now,
    });
  });

  // ✅ pick best event per series
  const final = {};
  const priority = { live: 1, upcoming: 2, completed: 3 };

  Object.values(eventsMap).forEach((event) => {
    const key = event.series;

    if (!final[key]) {
      final[key] = event;
      return;
    }

    const current = final[key];

    if (
      priority[event.status] < priority[current.status] ||
      (priority[event.status] === priority[current.status] &&
        event.event_start < current.event_start)
    ) {
      final[key] = event;
    }
  });

  return Object.values(final).sort(
    (a, b) => new Date(a.event_start) - new Date(b.event_start),
  );
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
