const axios = require("axios");
const { DateTime } = require("luxon");

const BASE_API = "https://api.dtm.com/data";

/**
 * 🌍 Country → Timezone mapping (DTM Europe only)
 */
const COUNTRY_TIMEZONES = {
  AT: "Europe/Vienna",
  DE: "Europe/Berlin",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  IT: "Europe/Rome",
  ES: "Europe/Madrid",
  PT: "Europe/Lisbon",
};

/**
 * 🌍 Fallback timezone (central Europe)
 */
const FALLBACK_TIMEZONE = "Europe/Berlin";

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
 * Get timezone safely
 */
function getTimezone(countryCode, city, slug) {
  const tz = COUNTRY_TIMEZONES[countryCode];

  if (!tz) {
    console.warn(
      `⚠️ Unknown timezone mapping for ${city || "Unknown city"} (${countryCode}) in event ${slug}. Using fallback ${FALLBACK_TIMEZONE}`,
    );
    return FALLBACK_TIMEZONE;
  }

  return tz;
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

      const countryCode = event.country?.countryCode;

      // 👉 Resolve timezone
      const timezone = getTimezone(countryCode, details.city, event.slug);

      // 👉 Event
      const eventObj = {
        series_id: 5,
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
        const utcStart = s.start ? DateTime.fromISO(s.start) : null;

        const utcEnd = s.end ? DateTime.fromISO(s.end) : null;

        const localStart = utcStart ? utcStart.setZone(timezone) : null;

        const localEnd = utcEnd ? utcEnd.setZone(timezone) : null;

        const event_timezone = localStart
          ? `UTC${localStart.toFormat("ZZ")}`
          : null;

        const sessionObj = {
          event_slug: event.slug,
          session_name: s.label,
          session_type: getSessionType(s.label),

          // ✅ UTC (from API)
          start_time_utc: utcStart?.toISO() || null,
          end_time_utc: utcEnd?.toISO() || null,

          // ✅ LOCAL (derived)
          start_time_local: localStart?.toISO() || null,
          end_time_local: localEnd?.toISO() || null,

          // ✅ TIMEZONE
          event_timezone,

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
