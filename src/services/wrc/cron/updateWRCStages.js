const db = require("../../../../db/pool");
const { ingestLatestPdfStages } = require("../wrcStageService");

async function updateWRCStages() {
  try {
    console.log("WRC cron started");

    // Optional: Check if there is an upcoming event
    const res = await db.query(`
      SELECT id, event_name
      FROM events
      WHERE series_id = (
        SELECT id FROM series WHERE short_name = 'WRC'
      )
      AND start_date >= NOW()
      ORDER BY start_date ASC
      LIMIT 1
    `);

    if (!res.rows.length) {
      console.log("No upcoming WRC events");
      return;
    }

    console.log(`Processing event: ${res.rows[0].event_name}`);

    // 👉 Main ingestion (this already handles hash + notifications)
    await ingestLatestPdfStages();

    console.log("WRC cron completed");
  } catch (err) {
    console.error("WRC cron error:", err.message);
  }
}

if (require.main === module) {
  (async () => {
    await updateWRCStages();
  })();
}

module.exports = { updateWRCStages };
