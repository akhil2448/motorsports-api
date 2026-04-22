const db = require("../../../../db/pool");
const axios = require("axios");
const { randomUUID } = require("crypto");
const { DateTime } = require("luxon");
const crypto = require("crypto");

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

function generateSessionsHash(sessions) {
  const normalized = sessions
    .map((s) => ({
      name: s.label,
      start: s.start,
      end: s.end,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return crypto
    .createHash("md5")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

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
    ["DTM"],
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

function normalizeSessionType(label) {
  const l = label.toLowerCase();
  if (l.includes("practice")) return "Practice";
  if (l.includes("qual")) return "Qualifying";
  if (l.includes("race")) return "Race";
  return "Other";
}

async function getUpcomingEvents() {
  const res = await db.query(`
    SELECT id, slug, event_name, start_date, series_id
    FROM events
    WHERE series_id = 5
      AND start_date IS NOT NULL
      AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  `);
  return res.rows;
}

async function fetchEventDetails(slug) {
  const url = `${BASE_API}?query=eventDetails&slug=${slug}&lang=en`;
  const { data } = await axios.get(url);
  return data.events?.[0] || null;
}

async function insertSessions(eventId, slug, timetable, eventTimezone) {
  const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");

  let order = 1;

  for (const s of dtmSessions) {
    const utcStart = s.start
      ? DateTime.fromISO(s.start, { zone: "utc" })
      : null;

    const utcEnd = s.end ? DateTime.fromISO(s.end, { zone: "utc" }) : null;

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
        order++,
        `${slug}_${utcStart?.toISO()}_${order}`,
      ],
    );
  }

  return dtmSessions.length;
}

/**
 * MAIN
 */
async function updateDtmSessions() {
  console.log("⏳ Checking DTM events...");

  const events = await getUpcomingEvents();

  for (const event of events) {
    const { id, slug, series_id } = event;

    console.log(`\nProcessing: ${event.event_name}`);

    const details = await fetchEventDetails(slug);
    if (!details) continue;

    const timetable = details.timetable || [];

    if (!timetable.length) {
      console.log("→ Timetable not published yet");
      continue;
    }

    const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");
    const newHash = generateSessionsHash(dtmSessions);

    const res = await db.query(`SELECT pdf_hash FROM events WHERE id = $1`, [
      id,
    ]);

    const existingHash = res.rows[0]?.pdf_hash || null;

    if (existingHash && existingHash === newHash) {
      console.log(`⏭️ No changes: ${event.event_name}`);
      continue;
    }

    const countryCode = details.country?.countryCode;
    const eventTimezone = getTimezone(countryCode);

    // 🔥 CRITICAL FIX: delete old sessions
    await db.query(`DELETE FROM sessions WHERE event_id = $1`, [id]);

    const insertedCount = await insertSessions(
      id,
      slug,
      timetable,
      eventTimezone,
    );

    if (insertedCount === 0) continue;

    // 🔄 Update hash
    await db.query(`UPDATE events SET pdf_hash = $1 WHERE id = $2`, [
      newHash,
      id,
    ]);

    const isNew = !existingHash;

    await createNotificationsForUsers({
      seriesId: series_id,
      eventId: id,
      type: isNew ? "schedule_released" : "schedule_updated",
      title: "DTM",
      message: `${event.event_name} • ${
        isNew ? "Schedule Released" : "Schedule Updated"
      }`,
      data: { sessions_count: insertedCount },
      dedupeKey: `dtm_event_${id}_schedule_${isNew ? "released" : "updated"}_${newHash}`,
    });

    console.log("🔔 Notification created");
  }

  console.log("\n✅ DTM cron completed");
}

module.exports = { updateDtmSessions };
