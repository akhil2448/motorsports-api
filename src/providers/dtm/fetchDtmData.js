const axios = require("axios");

const BASE_API = "https://api.dtm.com/data";

/**
 * Normalize session type
 */
function getSessionType(label) {
  const l = label.toLowerCase();

  if (l.includes("practice")) return "Practice";
  if (l.includes("qual")) return "Qualifying";
  if (l.includes("race")) return "Race";

  return "Other";
}

/**
 * Fetch event details (city + timetable)
 */
async function fetchEventDetails(slug) {
  const url = `${BASE_API}?query=eventDetails&slug=${slug}&lang=en`;

  const { data } = await axios.get(url);

  return data.events?.[0] || null;
}

/**
 * Main function
 */
async function fetchDtmData(year = "2026") {
  try {
    const url = `${BASE_API}?query=events&lang=en`;

    const { data } = await axios.get(url);

    if (!data?.events) throw new Error("Invalid API response");

    // 👉 Filter by year
    const events = data.events.filter((e) => e.eventCategory?.includes(year));

    // 👉 Sort
    events.sort((a, b) => a.eventNumber - b.eventNumber);

    const normalizedEvents = [];
    const allSessions = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      console.log(`Processing: ${event.slug}`);

      const details = await fetchEventDetails(event.slug);

      if (!details) continue;

      // 👉 Event
      const eventObj = {
        series_id: 5, // update later
        event_name: event.name,
        location: details.city || null,
        country: event.country?.name || null,
        start_date: event.startTime ? event.startTime.split("T")[0] : null,
        end_date: event.endTime ? event.endTime.split("T")[0] : null,
        round_number: i + 1,
        external_event_id: event.slug,
        slug: event.slug,
      };

      normalizedEvents.push(eventObj);

      // 👉 Sessions
      const timetable = details.timetable || [];

      const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");

      dtmSessions.forEach((s, index) => {
        const sessionObj = {
          event_slug: event.slug,
          session_name: s.label,
          session_type: getSessionType(s.label),
          start_time_utc: s.start || null,
          end_time_utc: s.end || null,
          session_order: index + 1,
          external_session_id: `${event.slug}_${index + 1}`,
        };

        allSessions.push(sessionObj);
      });
    }

    console.log("\n==== EVENTS ====");
    console.dir(normalizedEvents, { depth: null });

    console.log("\n==== SESSIONS ====");
    console.dir(allSessions, { depth: null });

    return {
      events: normalizedEvents,
      sessions: allSessions,
    };
  } catch (error) {
    console.error("❌ Error fetching DTM data:", error.message);
    throw error;
  }
}

// 👇 run directly
if (require.main === module) {
  fetchDtmData("2026")
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fetchDtmData };
