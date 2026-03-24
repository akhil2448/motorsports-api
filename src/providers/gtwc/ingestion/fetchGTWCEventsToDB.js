const { fetchGTWCEvents } = require("../fetchGTWCEvents");
const db = require("../../../../db/pool");

async function ingestGTWCEvents() {
  try {
    console.log("GTWC Events ingestion started");

    const events = await fetchGTWCEvents();

    const seriesRes = await db.query(
      `SELECT id FROM series WHERE short_name = 'GTWC Europe' LIMIT 1`,
    );

    if (!seriesRes.rows.length) {
      throw new Error("GTWC Europe series not found");
    }

    const seriesId = seriesRes.rows[0].id;

    for (const event of events) {
      await db.query(
        `
  INSERT INTO events (
    series_id,
    event_name,
    location,
    country,
    start_date,
    end_date,
    external_event_id,
    slug
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  ON CONFLICT (external_event_id) DO UPDATE SET
    event_name = EXCLUDED.event_name,
    location = EXCLUDED.location,
    country = EXCLUDED.country,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    slug = EXCLUDED.slug
  `,
        [
          seriesId,
          event.name,
          event.location,
          event.country,
          event.start_date,
          event.end_date,
          event.external_event_id,
          event.slug,
        ],
      );

      console.log(`Upserted event: ${event.name}`);
    }

    console.log("GTWC Events ingestion completed");
  } catch (err) {
    console.error("GTWC Events ingestion error:", err.message);
  }
}

module.exports = { ingestGTWCEvents };
