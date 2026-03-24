const { fetchDtmEvents } = require("../fetchDtmEvents");
const db = require("../../../../db/pool");

async function ingestDtmEvents(year = "2026") {
  try {
    console.log("🚀 Running DTM events ingestion...");

    const events = await fetchDtmEvents(year);

    for (const event of events) {
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

      await db.query(query, values);

      console.log(`→ Upserted: ${event.event_name}`);
    }

    console.log("✅ DTM events ingestion completed");

    return; // ✅ important (no process.exit)
  } catch (err) {
    console.error("❌ DTM events ingestion failed:", err);

    throw err; // ✅ propagate error to seedAll
  }
}

// 👇 run standalone only
if (require.main === module) {
  ingestDtmEvents("2026")
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { ingestDtmEvents };
