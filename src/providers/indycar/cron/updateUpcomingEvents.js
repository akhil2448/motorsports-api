const db = require("../../../../db/pool");
const { fetchIndycarEventDetails } = require("../fetchEventDetails");
const { DateTime } = require("luxon");
const { randomUUID } = require("crypto");

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
 * Convert ET → UTC
 */
function convertToUTC(dayStr, timeStr, year) {
  try {
    if (!timeStr) return null;

    const cleanTime = timeStr.replace(" ET", "").trim();
    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return null;

    return dt.toUTC().toISO();
  } catch {
    return null;
  }
}

/**
 * ✅ NEW: keep ET as local
 */
function convertToLocalET(dayStr, timeStr, year) {
  try {
    if (!timeStr) return null;

    const cleanTime = timeStr.replace(" ET", "").trim();
    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return null;

    return dt.toISO();
  } catch {
    return null;
  }
}

/**
 * Normalize session type
 */
function normalizeSessionType(type) {
  const t = type.toLowerCase();

  if (t.includes("practice")) return "Practice";
  if (t.includes("qual")) return "Qualifying";
  if (t.includes("warm")) return "Warm Up";
  if (t.includes("race")) return "Race";

  return type;
}

/**
 * Parse date
 */
function parseDate(dayStr, year) {
  const date = new Date(`${dayStr}, ${year}`);
  return isNaN(date) ? null : date.toISOString().split("T")[0];
}

function getEventTimezone(dayStr, timeStr, year) {
  try {
    const cleanTime = timeStr.replace(" ET", "").trim();
    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return "UTC+00:00";

    const offset = dt.offset;

    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);

    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const mins = String(abs % 60).padStart(2, "0");

    return `UTC${sign}${hours}:${mins}`;
  } catch {
    return "UTC+00:00";
  }
}

async function getAllIndycarEvents() {
  const query = `
    SELECT id, slug, end_date, series_id
    FROM events
    WHERE series_id = 4
      AND slug IS NOT NULL
  `;

  const res = await db.query(query);
  return res.rows;
}

/**
 * Fetch events within 2 weeks needing update
 */
async function getUpcomingEvents() {
  const query = `
    SELECT id, slug, end_date, series_id
    FROM events
    WHERE series_id = 4
      AND start_date IS NULL
      AND end_date IS NOT NULL
      AND end_date <= NOW() + INTERVAL '14 days'
  `;

  const res = await db.query(query);
  return res.rows;
}

/**
 * Insert / Update sessions
 */
async function insertSessions(eventId, slug, schedule, year) {
  for (let i = 0; i < schedule.length; i++) {
    const s = schedule[i];

    const startUTC = convertToUTC(s.day, s.time, year);
    const startLocal = convertToLocalET(s.day, s.time, year);

    const session = {
      session_name: s.description.replace("NTT INDYCAR SERIES - ", "").trim(),
      session_type: normalizeSessionType(s.description),

      start_time_utc: startUTC,
      end_time_utc: null,

      start_time_local: startLocal,
      end_time_local: null,
      event_timezone: getEventTimezone(s.day, s.time, year),

      session_order: i + 1,
      external_session_id: `${slug}_${i + 1}`,
    };

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
      DO UPDATE SET
        session_name = EXCLUDED.session_name,
        session_type = EXCLUDED.session_type,
        start_time_utc = EXCLUDED.start_time_utc,
        end_time_utc = EXCLUDED.end_time_utc,
        start_time_local = EXCLUDED.start_time_local,
        end_time_local = EXCLUDED.end_time_local,
        event_timezone = EXCLUDED.event_timezone,
        session_order = EXCLUDED.session_order;
      `,
      [
        eventId,
        session.session_name,
        session.session_type,
        session.start_time_utc,
        session.end_time_utc,
        session.start_time_local,
        session.end_time_local,
        session.event_timezone,
        session.session_order,
        session.external_session_id,
      ],
    );
  }
}

/**
 * Main Cron Logic
 */
async function updateUpcomingEvents() {
  console.log("⏳ Checking upcoming IndyCar events...");

  const events = await getUpcomingEvents();
  //const events = await getAllIndycarEvents();

  if (!events.length) {
    console.log("✅ No events need updating");
    return;
  }

  for (const event of events) {
    const { id, slug, end_date, series_id } = event;

    console.log(`\nProcessing: ${slug}`);

    const url = `https://www.indycar.com/Schedule/2026/${slug}`;
    const details = await fetchIndycarEventDetails(url);
    const schedule = details.schedule;

    if (!schedule || schedule.length <= 1) {
      console.log("→ Still no full schedule");
      continue;
    }

    const existingRes = await db.query(
      `SELECT COUNT(*) FROM sessions WHERE event_id = $1`,
      [id],
    );

    const existingCount = parseInt(existingRes.rows[0].count, 10);

    const firstDate = parseDate(schedule[0].day, "2026");

    await db.query(
      `
      UPDATE events
      SET start_date = $1
      WHERE id = $2
      `,
      [firstDate, id],
    );

    console.log("→ start_date updated");

    await insertSessions(id, slug, schedule, "2026");

    console.log("→ sessions upserted");

    if (existingCount === 0) {
      await createNotification({
        seriesId: series_id,
        eventId: id,
        type: "schedule_released",

        title: "IndyCar Schedule Released",
        message: `${slug} full schedule is now available`,

        data: {
          sessions_count: schedule.length,
        },

        dedupeKey: `indycar_event_${id}_schedule_released`,
      });

      console.log("🔔 Notification created (schedule released)");
    }
  }

  console.log("\n✅ Upcoming events update completed");
}

if (require.main === module) {
  updateUpcomingEvents()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updateUpcomingEvents };
