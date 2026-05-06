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
    WHERE e.end_date >= NOW() - INTERVAL '1 day'  
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

    // fallback
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

      end = fallbackEnd || new Date(start.getTime() + 60 * 60000);
    }

    // ✅ guard invalid dates
    if (!start || isNaN(start)) return;
    if (!end || isNaN(end)) {
      end = new Date(start.getTime() + 60 * 60000);
    }

    // ✅ single source of truth
    const status = getStatus({
      start,
      end,
      now,
    });

    event.sessions.push({
      start,
      end,
      name: row.name,
      phase: row.phase || null,
      status,
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

      if (event.end_date) {
        const end = new Date(event.end_date);
        end.setUTCHours(23, 59, 59, 999); // 🔥 end of day
        event.event_end = end;
      } else {
        event.event_end = null;
      }
    }

    // ✅ status
    // 🔥 session-level truth
    const hasLiveSession = event.sessions.some(
      (s) => s.start && s.end && now >= s.start && now <= s.end,
    );

    const hasUpcomingSession = event.sessions.some(
      (s) => s.start && now < s.start,
    );

    // 🔥 event-level state
    // 🔥 FIX: handle events WITHOUT sessions
    if (hasLiveSession) {
      event.status = "live";
    }
    // 🔥 EVENT-LEVEL LOGIC (works even without sessions)
    else if (
      event.event_start &&
      event.event_end &&
      now >= event.event_start &&
      now <= event.event_end
    ) {
      event.status = "ongoing";
    } else if (event.event_start && now < event.event_start) {
      event.status = "upcoming";
    } else if (event.event_end && now > event.event_end) {
      event.status = "completed";
    } else {
      event.status = "upcoming"; // safe fallback
    }
  });

  // ✅ pick best event per series (DATE-DRIVEN — FIXED)
  const final = {};

  Object.values(eventsMap).forEach((event) => {
    const key = event.series;

    if (!final[key]) {
      final[key] = event;
      return;
    }

    const current = final[key];

    const nowTime = now.getTime();

    const eventStart = event.event_start?.getTime();
    const currentStart = current.event_start?.getTime();

    const eventEnd = event.event_end?.getTime();
    const currentEnd = current.event_end?.getTime();

    const isEventActive =
      eventStart && eventEnd && nowTime >= eventStart && nowTime <= eventEnd;

    const isCurrentActive =
      currentStart &&
      currentEnd &&
      nowTime >= currentStart &&
      nowTime <= currentEnd;

    // ✅ 1. Prefer ongoing/live
    if (isEventActive && !isCurrentActive) {
      final[key] = event;
      return;
    }

    // ✅ 2. If both NOT active → pick upcoming
    if (!isEventActive && !isCurrentActive) {
      const eventFuture = eventStart && eventStart > nowTime;
      const currentFuture = currentStart && currentStart > nowTime;

      if (eventFuture && !currentFuture) {
        final[key] = event;
        return;
      }

      // both future → pick closest
      if (eventFuture && currentFuture && eventStart < currentStart) {
        final[key] = event;
        return;
      }

      // 🔥 FIX: both past → pick latest past
      if (!eventFuture && !currentFuture && eventStart > currentStart) {
        final[key] = event;
        return;
      }
    }

    // ✅ 3. fallback → keep closest past (do nothing)
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
