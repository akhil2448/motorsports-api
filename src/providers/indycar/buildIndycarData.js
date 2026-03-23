const { fetchIndycarEvents } = require("./fetchEventLinks");
const { fetchIndycarEventDetails } = require("./fetchEventDetails");
const { DateTime } = require("luxon");

const SERIES_ID = 4; // update if needed

/**
 * Remove unwanted prefix
 */
function cleanSessionDescription(desc) {
  return desc.replace("NTT INDYCAR SERIES - ", "").trim();
}

/**
 * Convert (day + time ET) → UTC timestamptz
 */
function convertToUTC(dayStr, timeStr, year) {
  try {
    if (!timeStr) return null;

    const cleanTime = timeStr.replace(" ET", "").trim();

    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return null;

    return dt.toUTC().toISO(); // ISO string for Postgres timestamptz
  } catch (err) {
    return null;
  }
}

/**
 * Parse date only (for events table)
 */
function parseDate(dayStr, year) {
  const date = new Date(`${dayStr}, ${year}`);
  return isNaN(date) ? null : date.toISOString().split("T")[0];
}

/**
 * Determine session type
 */
function getSessionType(desc) {
  const d = desc.toLowerCase();

  if (d.includes("practice")) return "practice";
  if (d.includes("qual")) return "qualifying";
  if (d.includes("warmup")) return "warmup";
  if (d.includes("race")) return "race";

  return "other";
}

/**
 * Country detection
 */
function getCountry(location) {
  if (!location) return "USA";

  const l = location.toLowerCase();

  if (l.includes("toronto")) return "Canada";

  return "USA";
}

async function buildIndycarData(year = "2026") {
  const eventsMeta = await fetchIndycarEvents(year);

  const allEvents = [];
  const allSessions = [];

  let round = 1;

  for (const meta of eventsMeta) {
    const { url, slug, event_name, location } = meta;

    console.log(`\nProcessing: ${url}`);

    const details = await fetchIndycarEventDetails(url);
    const schedule = details.schedule;

    if (!schedule || schedule.length === 0) continue;

    // 👉 Dates
    const firstDate = parseDate(schedule[0].day, year);

    const raceSession = schedule.find((s) =>
      s.description.toLowerCase().includes("race"),
    );

    const raceDate = raceSession ? parseDate(raceSession.day, year) : firstDate;

    const startDate = schedule.length > 1 ? firstDate : null;

    const endDate = raceDate;

    // 👉 Event object
    const eventObj = {
      series_id: SERIES_ID,
      event_name,
      location,
      country: getCountry(location),
      start_date: startDate,
      end_date: endDate,
      round_number: round,
      external_event_id: slug,
      slug,
      itinerary_hash: null,
    };

    allEvents.push(eventObj);

    // 👉 Sessions
    schedule.forEach((s, index) => {
      const cleanedDesc = cleanSessionDescription(s.description);

      const sessionObj = {
        event_slug: slug, // temp mapping before DB insert
        session_name: cleanedDesc,
        session_type: getSessionType(cleanedDesc),
        start_time_utc: convertToUTC(s.day, s.time, year),
        end_time_utc: null,
        session_order: index + 1,
        external_session_id: `${slug}_${index + 1}`,
      };

      allSessions.push(sessionObj);
    });

    round++;
  }

  return {
    events: allEvents,
    sessions: allSessions,
  };
}

// 👇 test runner
if (require.main === module) {
  (async () => {
    const data = await buildIndycarData("2026");

    console.log("\n==== EVENTS ====");
    console.dir(data.events, { depth: null });

    console.log("\n==== SESSIONS ====");
    console.dir(data.sessions, { depth: null });
  })();
}

module.exports = { buildIndycarData };
