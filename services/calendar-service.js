require("../src/config/env");
const pool = require("../db/pool");
const { getFallbackEndTime } = require("../utils/fallbackDuration");
const { getStatus } = require("../utils/status");

async function getCalendar(days = 7) {
  const [eventsRes, unitsRes] = await Promise.all([
    pool.query(`
      SELECT
        e.id AS event_id,
        e.event_name,
        e.location,
        e.country,
        e.start_date AS event_start,
        e.end_date AS event_end,
        s.short_name AS series
      FROM events e
      JOIN series s ON e.series_id = s.id
      WHERE DATE_PART('year', e.start_date) = DATE_PART('year', NOW())
      ORDER BY e.start_date
    `),

    pool.query(`
      SELECT *
      FROM calendar_units_view
      WHERE start_time IS NOT NULL
      AND DATE_PART('year', start_time) = DATE_PART('year', NOW())
      ORDER BY start_time
    `),
  ]);

  return formatCalendar(eventsRes.rows, unitsRes.rows);
}

async function getLiveCalendar() {
  const [eventsRes, unitsRes] = await Promise.all([
    pool.query(`
      SELECT
        e.id AS event_id,
        e.event_name,
        e.location,
        e.country,
        e.start_date AS event_start,
        e.end_date AS event_end,
        s.short_name AS series
      FROM events e
      JOIN series s ON e.series_id = s.id
      WHERE DATE_PART('year', e.start_date) = DATE_PART('year', NOW())
      ORDER BY e.start_date
    `),

    pool.query(`
      SELECT *
      FROM calendar_units_view
      WHERE start_time IS NOT NULL
      ORDER BY start_time
    `),
  ]);

  return formatCalendar(eventsRes.rows, unitsRes.rows);
}

function normalizeLocalTime(value) {
  if (!value) return null;

  const d =
    typeof value === "string" && value.includes(" ")
      ? new Date(value.replace(" ", "T"))
      : new Date(value);

  if (isNaN(d)) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function formatCalendar(eventRows, unitRows) {
  const seriesMap = {};

  eventRows.forEach((row) => {
    const series = row.series;

    if (!seriesMap[series]) {
      seriesMap[series] = {
        series,
        events: [],
      };
    }

    const endDate = row.event_end ? new Date(row.event_end) : null;

    const startDate = row.event_start
      ? new Date(row.event_start)
      : endDate
        ? new Date(endDate.getTime() - 2 * 86400000)
        : null;

    seriesMap[series].events.push({
      event_id: row.event_id,
      name: row.event_name,
      location: row.location,
      country: row.country,
      startDate,
      endDate,
      sessions: [],
    });
  });

  unitRows.forEach((row) => {
    const series = row.series;
    const eventId = row.event_id;

    if (!seriesMap[series]) return;

    const event = seriesMap[series].events.find((e) => e.event_id === eventId);

    if (!event) return;

    event.sessions.push({
      name: row.name,
      session_type: row.unit_type,
      start_time_utc: new Date(row.start_time),
      end_time_utc: row.end_time ? new Date(row.end_time) : null,
      start_time_local: normalizeLocalTime(row.start_time_local),
      end_time_local: normalizeLocalTime(row.end_time_local),
      event_timezone: row.event_timezone,
    });
  });

  const now = new Date();

  // ✅ PROCESS (fallback + status + sorting)
  Object.values(seriesMap).forEach((seriesObj) => {
    seriesObj.events.forEach((event) => {
      // 🔥 Apply fallback durations
      event.sessions.forEach((session) => {
        // 🔥 FIX: derive local time if missing (DTM case)
        if (
          !session.start_time_local &&
          session.start_time_utc &&
          session.event_timezone
        ) {
          const utc = new Date(session.start_time_utc);

          const offsetMatch =
            session.event_timezone.match(/([+-]\d{2}):(\d{2})/);

          if (offsetMatch) {
            const sign = offsetMatch[1].startsWith("-") ? -1 : 1;
            const hours = Math.abs(parseInt(offsetMatch[1]));
            const mins = parseInt(offsetMatch[2]);

            const offsetMinutes = sign * (hours * 60 + mins);

            const local = new Date(utc.getTime() + offsetMinutes * 60000);

            session.start_time_local = normalizeLocalTime(local);
          }
        }

        if (!session.end_time_utc) {
          const fallbackEndUtc = getFallbackEndTime({
            series: seriesObj.series,
            session,
            event,
          });

          if (fallbackEndUtc) {
            session.end_time_utc = fallbackEndUtc;

            // ✅ ALSO compute LOCAL fallback
            if (session.start_time_local && !session.end_time_local) {
              const duration =
                fallbackEndUtc.getTime() - session.start_time_utc.getTime();

              const localStart = new Date(session.start_time_local);

              const localEnd = new Date(localStart.getTime() + duration);

              const yyyy = localEnd.getFullYear();
              const mm = String(localEnd.getMonth() + 1).padStart(2, "0");
              const dd = String(localEnd.getDate()).padStart(2, "0");
              const hh = String(localEnd.getHours()).padStart(2, "0");
              const min = String(localEnd.getMinutes()).padStart(2, "0");
              const ss = String(localEnd.getSeconds()).padStart(2, "0");

              session.end_time_local = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
            }
          }
        }

        // 🔥 Compute status
        const start = session.start_time_utc;
        const end = session.end_time_utc;

        session.status = getStatus({ start, end, now });
      });

      // ✅ Sort sessions
      event.sessions.sort((a, b) => a.start_time_utc - b.start_time_utc);
    });

    // ✅ Sort events
    seriesObj.events.sort((a, b) => a.startDate - b.startDate);
  });

  return Object.values(seriesMap);
}

module.exports = {
  getCalendar,
  getLiveCalendar,
};
