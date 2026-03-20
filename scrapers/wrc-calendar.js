const { fetchCalendarEvents } = require("../src/scrapers/wrcCalendarScraper");

const { mapSlugsToEvents } = require("../src/services/wrc/wrcCalendarService");

/* ---------------------------------- */
/* MAIN                               */
/* ---------------------------------- */

async function run() {
  const events = await fetchCalendarEvents();

  await mapSlugsToEvents(events);

  console.log("Done");
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
