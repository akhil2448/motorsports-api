const db = require("../../../../db/pool");
const { upsertGTWCSessions } = require("../ingestion/fetchGTWCSessionsToDB");

async function updateGTWCSessions() {
  try {
    console.log("GTWC cron started");

    const eventsRes = await db.query(`
      SELECT *
      FROM events
      WHERE series_id = (
        SELECT id FROM series WHERE short_name = 'GTWC'
      )
      AND start_date <= NOW() + INTERVAL '14 days'
      AND end_date >= NOW() - INTERVAL '1 day'
    `);

    const events = eventsRes.rows;

    console.log(`Found ${events.length} upcoming GTWC events`);

    for (const event of events) {
      await upsertGTWCSessions(event);
    }

    console.log("GTWC cron completed");
  } catch (err) {
    console.error("GTWC cron error:", err.message);
  }
}

if (require.main === module) {
  (async () => {
    await updateGTWCSessions();
  })();
}

module.exports = { updateGTWCSessions };
