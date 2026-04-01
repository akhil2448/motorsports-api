const db = require("../../../../db/pool");
const axios = require("axios");
const { randomUUID } = require("crypto");
const { DateTime } = require("luxon");

const BASE_API = "https://api.dtm.com/data";

function getTimezone(countryCode) {
  const map = {
    AT: "Europe/Vienna",
    DE: "Europe/Berlin",
    NL: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    IT: "Europe/Rome",
    ES: "Europe/Madrid",
    PT: "Europe/Lisbon",
  };

  return map[countryCode] || "Europe/Berlin";
}

/**
 * 🔔 Notification helper
 */
async function createNotification(payload) {
  const { seriesId, eventId, type, title, message, data, dedupeKey } = payload;

  const query = `
    INSERT INTO notifications (
      id, series_id, event_id, type, title, message, data, dedupe_key
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (dedupe_key) DO NOTHING
  `;

  await db.query(query, [
    randomUUID(),
    seriesId,
    eventId,
    type,
    title,
    message,
    data,
    dedupeKey,
  ]);
}

/**
 * Normalize session type
 */
function normalizeSessionType(label) {
  const l = label.toLowerCase();

  if (l.includes("practice")) return "Practice";
  if (l.includes("qual")) return "Qualifying";
  if (l.includes("race")) return "Race";

  return "Other";
}

/**
 * Get upcoming DTM events (within 14 days)
 */
async function getUpcomingEvents() {
  const query = `
    SELECT id, slug, event_name, start_date, series_id
    FROM events
    WHERE series_id = 5
      AND start_date IS NOT NULL
      AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  `;

  const res = await db.query(query);
  return res.rows;
}

/**
 * Check if sessions already exist
 */
// async function sessionsExist(eventId) {
//   const res = await db.query(
//     `SELECT 1 FROM sessions WHERE event_id = $1 LIMIT 1`,
//     [eventId],
//   );

//   return res.rows.length > 0;
// }

/**
 * Fetch event details
 */
async function fetchEventDetails(slug) {
  const url = `${BASE_API}?query=eventDetails&slug=${slug}&lang=en`;
  const { data } = await axios.get(url);
  return data.events?.[0] || null;
}

/**
 * Insert sessions
 */
async function insertSessions(eventId, slug, timetable, eventTimezone) {
  const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");

  for (let i = 0; i < dtmSessions.length; i++) {
    const s = dtmSessions[i];

    const utcStart = s.start
      ? DateTime.fromISO(s.start, { zone: "utc" })
      : null;
    const utcEnd = s.end ? DateTime.fromISO(s.end, { zone: "utc" }) : null;

    // 👇 get timezone from event (we’ll pass it)
    const localStart = utcStart ? utcStart.setZone(eventTimezone) : null;
    const localEnd = utcEnd ? utcEnd.setZone(eventTimezone) : null;

    const event_timezone = localStart
      ? `UTC${localStart.toFormat("ZZ")}`
      : null;

    await db.query(
      `
  INSERT INTO sessions (
    event_id,
    session_name,
    session_type,
    start_time_utc,
    end_time_utc,
    start_time_local,
    end_time_local,
    event_timezone,
    session_order,
    external_session_id
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  ON CONFLICT (event_id, external_session_id)
  DO NOTHING;
  `,
      [
        eventId,
        s.label,
        normalizeSessionType(s.label),

        utcStart?.toISO() || null,
        utcEnd?.toISO() || null,

        localStart?.toFormat("yyyy-MM-dd HH:mm:ss") || null,
        localEnd?.toFormat("yyyy-MM-dd HH:mm:ss") || null,

        event_timezone,

        i + 1,

        `${slug}_${utcStart?.toISO()}_${i + 1}`,
      ],
    );
  }

  return dtmSessions.length;
}

/**
 * Main cron job
 */
async function updateDtmSessions() {
  console.log("⏳ Checking DTM events...");

  const events = await getUpcomingEvents();

  if (!events.length) {
    console.log("✅ No upcoming DTM events");
    return;
  }

  for (const event of events) {
    const { id, slug, series_id } = event;

    console.log(`\nProcessing: ${event.event_name}`);

    // 👉 Skip if already inserted
    // const exists = await sessionsExist(id);
    // if (exists) {
    //   console.log("→ Sessions already exist, skipping");
    //   continue;
    // }

    const details = await fetchEventDetails(slug);
    if (!details) continue;

    const timetable = details.timetable || [];

    if (!timetable.length) {
      console.log("→ Timetable not published yet");
      continue;
    }

    console.log("→ Timetable available, inserting sessions");

    const countryCode = details.country?.countryCode;
    const eventTimezone = getTimezone(countryCode);

    const insertedCount = await insertSessions(
      id,
      slug,
      timetable,
      eventTimezone,
    );

    console.log("→ Sessions inserted");

    // ⚠️ Guard: no notification if nothing inserted
    if (insertedCount === 0) {
      console.log("→ No DTM sessions found, skipping notification");
      continue;
    }

    // =========================
    // 🔔 CREATE NOTIFICATION
    // =========================
    await createNotification({
      seriesId: series_id,
      eventId: id,
      type: "schedule_released",

      title: "DTM Schedule Released",
      message: `${event.event_name} full schedule is now available`,

      data: {
        sessions_count: insertedCount,
      },

      dedupeKey: `dtm_event_${id}_schedule_released_v1`,
    });

    console.log("🔔 Notification created (schedule released)");
  }

  console.log("\n✅ DTM cron completed");
}

// 👇 run manually
if (require.main === module) {
  updateDtmSessions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updateDtmSessions };
