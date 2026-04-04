const db = require("../../../../db/pool");
const { fetchIndycarEventDetails } = require("../fetchEventDetails");
const {
  buildTrackTimesFromLocal,
} = require("../../../../utils/buildTrackTimes");
const { randomUUID } = require("crypto");

/**
 * 🔔 Notification helper
 */
async function createNotificationsForUsers(payload) {
  const { seriesId, eventId, type, title, message, data, dedupeKey } = payload;

  // 🔥 IndyCar short_name = INDYCAR
  const usersRes = await db.query(
    `
    SELECT user_id
    FROM user_preferences
    WHERE $1 = ANY(followed_series)
    `,
    ["INDYCAR"],
  );

  const users = usersRes.rows;

  for (const user of users) {
    const userDedupeKey = `${user.user_id}-${dedupeKey}`;

    await db.query(
      `
      INSERT INTO notifications (
        id,
        user_id,
        series_id,
        event_id,
        type,
        title,
        message,
        data,
        dedupe_key
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (dedupe_key) DO NOTHING
      `,
      [
        randomUUID(),
        user.user_id,
        seriesId,
        eventId,
        type,
        title,
        message,
        data,
        userDedupeKey,
      ],
    );
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

async function getAllIndycarEvents() {
  const query = `
    SELECT id, slug, event_name, end_date, series_id
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
    SELECT id, slug, event_name, end_date, series_id
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

    const times = buildTrackTimesFromLocal({
      dayStr: s.day,
      timeStr: s.time,
      year,
      zone: "America/New_York",
    });

    const session = {
      session_name: s.description.replace("NTT INDYCAR SERIES - ", "").trim(),
      session_type: normalizeSessionType(s.description),

      start_time_utc: times.start_time,
      end_time_utc: null,

      start_time_local: times.start_time_local,
      end_time_local: null,
      event_timezone: times.event_timezone,

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
    const { id, slug, event_name, end_date, series_id } = event;

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
      await createNotificationsForUsers({
        seriesId: series_id,
        eventId: id,
        type: "schedule_released",

        // ✅ Normalized title
        title: `${event_name} schedule released`,

        // ✅ Normalized message
        message: `INDYCAR|${event_name}|schedule has been released`,

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
