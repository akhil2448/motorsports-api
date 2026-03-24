const { fetchGTWCEvents } = require("../fetchGTWCEvents");
const { fetchGTWCSessions } = require("../fetchGTWCSessions");

(async () => {
  try {
    console.log("🚀 Running GTWC session debug...");

    const events = await fetchGTWCEvents();

    for (const event of events) {
      console.log(`\n=================================`);
      console.log(`EVENT: ${event.name}`);

      const data = await fetchGTWCSessions({
        ...event,
        source_url: `https://www.gt-world-challenge-europe.com/event/${event.slug}`,
      });

      console.log("HASH:", data.hash);
      console.log("SESSIONS:", data.sessions);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Debug failed:", err);
    process.exit(1);
  }
})();
