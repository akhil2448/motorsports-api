const { updateDtmSessions } = require("../cron/updateDtmSessions");

(async () => {
  try {
    console.log("🚀 Running DTM cron...");

    await updateDtmSessions();

    console.log("✅ DTM cron completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ DTM cron failed:", err);
    process.exit(1);
  }
})();
