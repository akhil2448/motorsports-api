const db = require("../../../../db/pool");
const { fetchIndycarEventDetails } = require("../fetchEventDetails");
const { DateTime } = require("luxon");

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
 * Fetch events within 2 weeks needing update
 */
async function getUpcomingEvents() {
  const query = `
    SELECT id, slug, end_date
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
 * Insert sessions
 */
async function insertSessions(eventId, slug, schedule, year) {
  for (let i = 0; i < schedule.length; i++) {
    const s = schedule[i];

    const session = {
      session_name: s.description.replace("NTT INDYCAR SERIES - ", "").trim(),
      session_type: normalizeSessionType(s.description),
      start_time_utc: convertToUTC(s.day, s.time, year),
      end_time_utc: null,
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
        session_order,
        external_session_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (event_id, external_session_id)
      DO NOTHING;
      `,
      [
        eventId,
        session.session_name,
        session.session_type,
        session.start_time_utc,
        session.end_time_utc,
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

  if (!events.length) {
    console.log("✅ No events need updating");
    return;
  }

  for (const event of events) {
    const { id, slug, end_date } = event;

    console.log(`\nProcessing: ${slug}`);

    const url = `https://www.indycar.com/Schedule/2026/${slug}`;

    const details = await fetchIndycarEventDetails(url);

    const schedule = details.schedule;

    if (!schedule || schedule.length <= 1) {
      console.log("→ Still no full schedule");
      continue;
    }

    // 👉 Update start_date
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

    // 👉 Insert sessions
    await insertSessions(id, slug, schedule, "2026");

    console.log("→ sessions inserted");
  }

  console.log("\n✅ Upcoming events update completed");
}

// 👇 run manually
if (require.main === module) {
  updateUpcomingEvents()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updateUpcomingEvents };
