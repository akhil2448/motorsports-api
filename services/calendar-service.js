require("../src/config/env");
const pool = require("../db/pool");
const { getFallbackEndTime } = require("../utils/fallbackDuration");
const { getStatus } = require("../utils/status");

async function getCalendar(days = 7) {
  const result = await pool.query(
    `
  SELECT *
  FROM calendar_units_view
  WHERE start_time IS NOT NULL
  AND DATE_PART('year', start_time) = DATE_PART('year', NOW())
  ORDER BY start_time
  `,
  );

  return formatCalendar(result.rows);
}

async function getLiveCalendar() {
  const result = await pool.query(`
    SELECT *
    FROM calendar_units_view
    WHERE start_time IS NOT NULL
    ORDER BY start_time
  `);

  return formatCalendar(result.rows);
}

function formatCalendar(rows) {
  const seriesMap = {};

  rows.forEach((row) => {
    const series = row.series;
    const eventId = row.event_id;

    // SERIES
    if (!seriesMap[series]) {
      seriesMap[series] = {
        series,
        events: [],
      };
    }

    // EVENT
    let event = seriesMap[series].events.find((e) => e.event_id === eventId);

    if (!event) {
      const endDate = new Date(row.event_end);

      const startDate = row.event_start
        ? new Date(row.event_start)
        : new Date(endDate.getTime() - 2 * 86400000); // ✅ fallback (-2 days)

      event = {
        event_id: eventId,
        name: row.event_name,
        location: row.location,
        country: row.country,
        startDate,
        endDate,
        sessions: [],
      };

      seriesMap[series].events.push(event);
    }

    // SESSION / STAGE
    event.sessions.push({
      name: row.name,
      session_type: row.unit_type,

      start_time_utc: new Date(row.start_time),
      end_time_utc: row.end_time ? new Date(row.end_time) : null,

      start_time_local: row.start_time_local || null,
      end_time_local: row.end_time_local || null,
    });
  });

  const now = new Date();

  // ✅ PROCESS (fallback + status + sorting)
  Object.values(seriesMap).forEach((seriesObj) => {
    seriesObj.events.forEach((event) => {
      // 🔥 Apply fallback durations
      event.sessions.forEach((session) => {
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

              // ✅ parse WITHOUT timezone shift
              const [datePart, timePart] = session.start_time_local.split(" ");

              const localStart = new Date(`${datePart}T${timePart}`); // safe format

              const localEnd = new Date(localStart.getTime() + duration);

              // ✅ format manually (NO toISOString)
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
