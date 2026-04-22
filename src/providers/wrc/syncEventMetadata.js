const axios = require("axios");
const pool = require("../../../db/pool");
const getUpcomingEvents = require("./getUpcomingEvents");

// --- dynamic year (no hardcoding)
function getYear() {
  return new Date().getFullYear();
}

// --- fetch metadata source
async function fetchPickemsData(year) {
  const url = `https://api-next.ewrc-results.com/pickems/season/${year}/actual`;
  const res = await axios.get(url);
  return res.data || [];
}

// --- update DB
async function updateEventMetadata({ ewrc_event_id, location, timezone }) {
  const query = `
    UPDATE events
    SET
      location = COALESCE($1, location),
      timezone = COALESCE($2, timezone)
    WHERE ewrc_event_id = $3
  `;

  const values = [location, timezone, ewrc_event_id];
  await pool.query(query, values);
}

// --- MAIN FUNCTION
async function syncEventMetadata() {
  console.log("🌍 Syncing event metadata (timezone + location)...");

  const year = getYear();

  const [upcomingEvents, pickemsData] = await Promise.all([
    getUpcomingEvents(),
    fetchPickemsData(year),
  ]);

  // build lookup map
  const pickemsMap = new Map();
  pickemsData.forEach((e) => {
    pickemsMap.set(String(e.id), e);
  });

  for (const event of upcomingEvents) {
    const data = pickemsMap.get(event.ewrc_event_id);

    if (!data) {
      console.warn(`⚠️ No pickems data for event ${event.ewrc_event_id}`);
      continue;
    }

    const location = data.centrum?.trim() || null;
    const timezone = data.timezone || null;

    try {
      await updateEventMetadata({
        ewrc_event_id: event.ewrc_event_id,
        location,
        timezone,
      });

      console.log(
        `✅ Updated metadata: ${event.event_name} | TZ=${timezone} | LOC=${location}`,
      );
    } catch (err) {
      console.error(
        `❌ Failed metadata update for ${event.ewrc_event_id}`,
        err.message,
      );
    }
  }

  console.log("✅ Event metadata sync complete");
}

module.exports = syncEventMetadata;
