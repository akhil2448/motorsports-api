const { buildIndycarData } = require("./buildIndycarData");
const db = require("../../../db/pool");

/**
 * Normalize session type to match DB standard
 */
function normalizeSessionType(type) {
  if (!type) return null;

  const t = type.toLowerCase();

  if (t.includes("practice")) return "Practice";
  if (t.includes("qual")) return "Qualifying";
  if (t.includes("warm")) return "Warm Up";
  if (t.includes("race")) return "Race";

  return type; // fallback
}

/**
 * Check if event has full schedule (more than just race)
 */
function hasFullSchedule(sessions) {
  if (!sessions || sessions.length <= 1) return false;

  const nonRaceSessions = sessions.filter(
    (s) => normalizeSessionType(s.session_type) !== "Race",
  );

  return nonRaceSessions.length > 0;
}

/**
 * Upsert event and return event_id
 */
async function upsertEvent(event) {
  const query = `
    INSERT INTO events (
      series_id,
      event_name,
      location,
      country,
      start_date,
      end_date,
      round_number,
      external_event_id,
      slug
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (external_event_id)
    DO UPDATE SET
      event_name = EXCLUDED.event_name,
      location = EXCLUDED.location,
      country = EXCLUDED.country,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      round_number = EXCLUDED.round_number
    RETURNING id;
  `;

  const values = [
    event.series_id,
    event.event_name,
    event.location,
    event.country,
    event.start_date,
    event.end_date,
    event.round_number,
    event.external_event_id,
    event.slug,
  ];

  const res = await db.query(query, values);
  return res.rows[0].id;
}

/**
 * Upsert session
 */
async function upsertSession(session, eventId) {
  const query = `
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
  `;

  const values = [
    eventId,
    session.session_name,
    normalizeSessionType(session.session_type), // ✅ FIX HERE
    session.start_time_utc,
    null, // always null as per your requirement
    session.session_order,
    session.external_session_id,
  ];

  await db.query(query, values);
}

async function ingestIndycar(year = "2026") {
  const { events, sessions } = await buildIndycarData(year);

  console.log(`\nProcessing ${events.length} events...\n`);

  for (const event of events) {
    const eventId = await upsertEvent(event);

    console.log(`Event: ${event.event_name} (ID: ${eventId})`);

    const eventSessions = sessions.filter((s) => s.event_slug === event.slug);

    if (!hasFullSchedule(eventSessions)) {
      console.log("→ Skipping sessions (only race or incomplete)\n");
      continue;
    }

    console.log(`→ Inserting ${eventSessions.length} sessions`);

    for (const session of eventSessions) {
      await upsertSession(session, eventId);
    }

    console.log("→ Sessions inserted\n");
  }

  console.log("✅ IndyCar ingestion completed");
}

// 👇 run directly
if (require.main === module) {
  ingestIndycar("2026")
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Error:", err);
      process.exit(1);
    });
}

module.exports = { ingestIndycar };
