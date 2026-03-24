const { ingestIndycar } = require("../ingestIndyCar");

(async () => {
  try {
    console.log("🚀 Running IndyCar ingestion...");
    await ingestIndycar("2026");
    console.log("✅ IndyCar ingestion completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ IndyCar ingestion failed:", err);
    process.exit(1);
  }
})();
