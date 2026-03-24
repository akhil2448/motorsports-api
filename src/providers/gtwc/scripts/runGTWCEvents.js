const { ingestGTWCEvents } = require("../ingestion/fetchGTWCEventsToDB");

(async () => {
  try {
    console.log("🚀 Running GTWC events ingestion...");

    await ingestGTWCEvents();

    console.log("✅ GTWC events ingestion completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ GTWC events ingestion failed:", err);
    process.exit(1);
  }
})();
