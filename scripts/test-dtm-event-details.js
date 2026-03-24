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
 * Test function for a single slug
 */
async function testDtmEvent(slug) {
  try {
    const url = `${BASE_API}?query=eventDetails&slug=${slug}&lang=en`;

    console.log(`Fetching: ${url}\n`);

    const { data } = await axios.get(url);

    const event = data.events?.[0];

    if (!event) {
      throw new Error("No event found");
    }

    // 👉 Event info
    const eventData = {
      event_name: event.name,
      location: event.city,
      start_date: event.startTime?.split("T")[0],
      end_date: event.endTime?.split("T")[0],
    };

    console.log("==== EVENT ====");
    console.dir(eventData, { depth: null });

    // 👉 Sessions
    const timetable = event.timetable || [];

    const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");

    const sessions = dtmSessions.map((s, index) => ({
      session_name: s.label,
      session_type: getSessionType(s.label),
      start_time_utc: s.start,
      end_time_utc: s.end,
      session_order: index + 1,
      external_session_id: `${slug}_${index + 1}`,
    }));

    console.log("\n==== SESSIONS ====");
    console.dir(sessions, { depth: null });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// 👇 Run test
if (require.main === module) {
  testDtmEvent("hockenheim-finale-2025");
}
