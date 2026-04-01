const { fetchIndycarEvents } = require("./fetchEventLinks");
const { fetchIndycarEventDetails } = require("./fetchEventDetails");
const { buildTrackTimesFromLocal } = require("../../../utils/buildTrackTimes");
const { DateTime } = require("luxon");

const SERIES_ID = 4;

/* =========================
   HELPERS
========================= */

function cleanSessionDescription(desc) {
  return desc.replace("NTT INDYCAR SERIES - ", "").trim();
}

function parseDate(dayStr, year) {
  const date = new Date(`${dayStr}, ${year}`);
  return isNaN(date) ? null : date.toISOString().split("T")[0];
}

function getSessionType(desc) {
  const d = desc.toLowerCase();

  if (d.includes("practice")) return "practice";
  if (d.includes("qual")) return "qualifying";
  if (d.includes("warmup")) return "warmup";
  if (d.includes("race")) return "race";

  return "other";
}

function getCountry(location) {
  if (!location) return "USA";

  const l = location.toLowerCase();

  if (l.includes("toronto")) return "Canada";

  return "USA";
}

/* =========================
   MAIN BUILDER
========================= */

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

    const firstDate = parseDate(schedule[0].day, year);

    const raceSession = schedule.find((s) =>
      s.description.toLowerCase().includes("race"),
    );

    const raceDate = raceSession ? parseDate(raceSession.day, year) : firstDate;

    const startDate = schedule.length > 1 ? firstDate : null;
    const endDate = raceDate;

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

    /* =========================
       SESSIONS
    ========================= */

    schedule.forEach((s, index) => {
      const cleanedDesc = cleanSessionDescription(s.description);

      const times = buildTrackTimesFromLocal({
        dayStr: s.day,
        timeStr: s.time,
        year,
        zone: "America/New_York",
      });

      const sessionObj = {
        event_slug: slug,
        session_name: cleanedDesc,
        session_type: getSessionType(cleanedDesc),

        start_time_utc: times.start_time,
        end_time_utc: null,

        // ✅ NEW FIELDS
        start_time_local: times.start_time_local,
        end_time_local: null,
        event_timezone: times.event_timezone,

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
