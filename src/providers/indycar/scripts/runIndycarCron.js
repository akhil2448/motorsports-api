const { updateUpcomingEvents } = require("../cron/updateUpcomingEvents");

(async () => {
  try {
    console.log("🚀 Running IndyCar cron...");
    await updateUpcomingEvents();
    console.log("✅ IndyCar cron completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ IndyCar cron failed:", err);
    process.exit(1);
  }
})();
