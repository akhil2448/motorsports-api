const { updateGTWCSessions } = require("../cron/updateGTWCSessions");

(async () => {
  try {
    console.log("🚀 Running GTWC cron...");

    await updateGTWCSessions();

    console.log("✅ GTWC cron completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ GTWC cron failed:", err);
    process.exit(1);
  }
})();
