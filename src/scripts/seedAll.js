const {
  ingestGTWCEvents,
} = require("../providers/gtwc/ingestion/fetchGTWCEventsToDB");
const {
  updateGTWCSessions,
} = require("../providers/gtwc/cron/updateGTWCSessions");

const { ingestIndycar } = require("../providers/indycar/ingestIndyCar");
const {
  updateUpcomingEvents,
} = require("../providers/indycar/cron/updateUpcomingEvents");

const { ingestDtmEvents } = require("../providers/dtm/scripts/runDtmEvents");
const {
  updateDtmSessions,
} = require("../providers/dtm/cron/updateDtmSessions");

async function seedAll() {
  try {
    console.log("🚀 Starting full motorsports data seed...\n");

    // =========================
    // GTWC
    // =========================
    console.log("🔵 GTWC: Ingesting events...");
    await ingestGTWCEvents();

    console.log("🔵 GTWC: Updating sessions...");
    await updateGTWCSessions();

    // =========================
    // IndyCar
    // =========================
    console.log("\n🟡 IndyCar: Ingesting events + sessions...");
    await ingestIndycar("2026");

    console.log("🟡 IndyCar: Running cron updates...");
    await updateUpcomingEvents();

    // =========================
    // DTM
    // =========================
    console.log("\n🔴 DTM: Ingesting events...");
    await ingestDtmEvents("2026");

    console.log("🔴 DTM: Updating sessions...");
    await updateDtmSessions();

    console.log("\n✅ All data seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  }
}

// run directly
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };
