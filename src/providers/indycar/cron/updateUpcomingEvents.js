const db = require("../../../../db/pool");
const { fetchIndycarEventDetails } = require("../fetchEventDetails");
const {
  buildTrackTimesFromLocal,
} = require("../../../../utils/buildTrackTimes");
const { randomUUID } = require("crypto");
const crypto = require("crypto");

/**
 * 🔔 Notification helper
 */
async function createNotificationsForUsers(payload) {
  const { seriesId, eventId, type, title, message, data, dedupeKey } = payload;

  const usersRes = await db.query(
    `
    SELECT user_id
    FROM user_preferences
    WHERE $1 = ANY(followed_series)
    `,
    ["INDYCAR"],
  );

  for (const user of usersRes.rows) {
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

/**
 * 🔥 HASH GENERATOR (CRITICAL)
 */
function generateSessionsHash(schedule, year) {
  const normalized = schedule
    .map((s) => {
      const times = buildTrackTimesFromLocal({
        dayStr: s.day,
        timeStr: s.time,
        year,
        zone: "America/New_York",
      });

      return {
        name: s.description,
        time: times.start_time,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  return crypto
    .createHash("md5")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

/**
 * Fetch events needing update
 */
async function getUpcomingEvents() {
  const res = await db.query(`
    SELECT id, slug, event_name, end_date, series_id
    FROM events
    WHERE series_id = 4
      AND start_date IS NULL
      AND end_date IS NOT NULL
      AND end_date <= NOW() + INTERVAL '14 days'
  `);

  return res.rows;
}

/**
 * Insert sessions (fresh insert)
 */
async function insertSessions(eventId, slug, schedule, year) {
  let order = 1;

  for (const s of schedule) {
    const times = buildTrackTimesFromLocal({
      dayStr: s.day,
      timeStr: s.time,
      year,
      zone: "America/New_York",
    });

    const session_name = s.description
      .replace("NTT INDYCAR SERIES - ", "")
      .trim();

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
      `,
      [
        eventId,
        session_name,
        normalizeSessionType(s.description),
        times.start_time,
        null,
        times.start_time_local,
        null,
        times.event_timezone,
        order,
        `${slug}_${order}`,
      ],
    );

    order++;
  }

  return schedule.length;
}

/**
 * MAIN
 */
async function updateUpcomingEvents() {
  console.log("⏳ Checking upcoming IndyCar events...");

  const events = await getUpcomingEvents();

  if (!events.length) {
    console.log("✅ No events need updating");
    return;
  }

  const currentYear = new Date().getFullYear();

  for (const event of events) {
    const { id, slug, event_name, series_id } = event;

    console.log(`\nProcessing: ${slug}`);

    const url = `https://www.indycar.com/Schedule/${currentYear}/${slug}`;
    const details = await fetchIndycarEventDetails(url);

    const schedule = details.schedule;

    if (!schedule || schedule.length <= 1) {
      console.log("→ Still no full schedule");
      continue;
    }

    const newHash = generateSessionsHash(schedule, currentYear);

    const res = await db.query(`SELECT pdf_hash FROM events WHERE id = $1`, [
      id,
    ]);

    const existingHash = res.rows[0]?.pdf_hash || null;

    if (existingHash && existingHash === newHash) {
      console.log(`⏭️ No changes: ${event_name}`);
      continue;
    }

    const firstDate = parseDate(schedule[0].day, currentYear);

    await db.query(`UPDATE events SET start_date = $1 WHERE id = $2`, [
      firstDate,
      id,
    ]);

    console.log("→ start_date updated");

    // 🔥 DELETE OLD SESSIONS
    await db.query(`DELETE FROM sessions WHERE event_id = $1`, [id]);

    const insertedCount = await insertSessions(id, slug, schedule, currentYear);

    console.log("→ sessions replaced");

    // 🔄 UPDATE HASH
    await db.query(`UPDATE events SET pdf_hash = $1 WHERE id = $2`, [
      newHash,
      id,
    ]);

    const isNew = !existingHash;

    await createNotificationsForUsers({
      seriesId: series_id,
      eventId: id,
      type: isNew ? "schedule_released" : "schedule_updated",
      title: "INDYCAR",
      message: `${event_name} • ${
        isNew ? "Schedule Released" : "Schedule Updated"
      }`,
      data: {
        sessions_count: insertedCount,
      },
      dedupeKey: `indycar_event_${id}_schedule_${isNew ? "released" : "updated"}_${newHash}`,
    });

    console.log("🔔 Notification created");
  }

  console.log("\n✅ IndyCar update completed");
}

module.exports = { updateUpcomingEvents };
