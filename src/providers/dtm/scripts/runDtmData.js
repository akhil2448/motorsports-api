const { fetchDtmData } = require("../fetchDtmData");

(async () => {
  try {
    console.log("🚀 Running DTM full data fetch...");

    const data = await fetchDtmData("2026");

    console.log("\n==== EVENTS ====");
    console.dir(data.events, { depth: null });

    console.log("\n==== SESSIONS ====");
    console.dir(data.sessions, { depth: null });

    console.log("✅ DTM data fetch completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ DTM data fetch failed:", err);
    process.exit(1);
  }
})();
