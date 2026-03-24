const { fetchGTWCEvents } = require("../src/providers/gtwc/fetchGTWCEvents");
const {
  fetchGTWCSessions,
} = require("../src/providers/gtwc/fetchGTWCSessions");

(async () => {
  const events = await fetchGTWCEvents();

  for (const event of events) {
    console.log("=================================");
    console.log("EVENT:", event.name);

    const sessionData = await fetchGTWCSessions(event);

    console.log("HASH:", sessionData.hash);
    console.log("SESSIONS:", sessionData.sessions);
  }
})();
