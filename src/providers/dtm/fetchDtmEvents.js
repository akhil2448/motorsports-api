const axios = require("axios");

const DTM_API = "https://api.dtm.com/data?query=events&lang=en";

/**
 * Fetch and normalize DTM events
 */
async function fetchDtmEvents(year = "2026") {
  try {
    const { data } = await axios.get(DTM_API);

    if (!data || !data.events) {
      throw new Error("Invalid API response");
    }

    // 👉 Filter only target year
    const events = data.events.filter((event) =>
      event.eventCategory?.includes(year),
    );

    // 👉 Sort by eventNumber (important)
    events.sort((a, b) => a.eventNumber - b.eventNumber);

    // 👉 Normalize
    const normalizedEvents = events.map((event, index) => {
      return {
        series_id: 5, // adjust later when you add DTM to series table
        event_name: event.name,
        location: event.racetrack?.name || null,
        country: event.racetrack?.country?.name || null,
        start_date: event.startTime ? event.startTime.split("T")[0] : null,
        end_date: event.endTime ? event.endTime.split("T")[0] : null,
        round_number: index + 1,
        external_event_id: event.slug,
        slug: event.slug,
      };
    });

    console.log(`\nFound ${normalizedEvents.length} DTM events\n`);

    console.dir(normalizedEvents, { depth: null });

    return normalizedEvents;
  } catch (error) {
    console.error("❌ Error fetching DTM events:", error.message);
    throw error;
  }
}

// 👇 run directly
if (require.main === module) {
  fetchDtmEvents("2026")
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fetchDtmEvents };
