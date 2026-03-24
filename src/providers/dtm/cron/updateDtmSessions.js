const db = require("../../../../db/pool");
const axios = require("axios");

const BASE_API = "https://api.dtm.com/data";

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
    SELECT id, slug, start_date
    FROM events
    WHERE series_id = 5
      AND start_date IS NOT NULL
      AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
  `;

  const res = await db.query(query);
  return res.rows;
}

/**
 * Check if sessions already exist
 */
async function sessionsExist(eventId) {
  const res = await db.query(
    `SELECT 1 FROM sessions WHERE event_id = $1 LIMIT 1`,
    [eventId],
  );

  return res.rows.length > 0;
}

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
async function insertSessions(eventId, slug, timetable) {
  const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");

  for (let i = 0; i < dtmSessions.length; i++) {
    const s = dtmSessions[i];

    await db.query(
      `
      INSERT INTO sessions (
        event_id,
        session_name,
        session_type,
        start_time_utc,
        end_time_utc,
        session_order,
        external_session_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (event_id, external_session_id)
      DO NOTHING;
      `,
      [
        eventId,
        s.label,
        normalizeSessionType(s.label),
        s.start,
        s.end,
        i + 1,
        `${slug}_${i + 1}`,
      ],
    );
  }
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
    const { id, slug } = event;

    console.log(`\nProcessing: ${slug}`);

    // 👉 Skip if already inserted
    const exists = await sessionsExist(id);
    if (exists) {
      console.log("→ Sessions already exist, skipping");
      continue;
    }

    const details = await fetchEventDetails(slug);

    if (!details) continue;

    const timetable = details.timetable || [];

    if (!timetable.length) {
      console.log("→ Timetable not published yet");
      continue;
    }

    console.log("→ Timetable available, inserting sessions");

    await insertSessions(id, slug, timetable);

    console.log("→ Sessions inserted");
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
