const { fetchIndycarEvents } = require("./fetchEventLinks");
const { fetchIndycarEventDetails } = require("./fetchEventDetails");
const { DateTime } = require("luxon");

const SERIES_ID = 4;

/* =========================
   HELPERS
========================= */

function cleanSessionDescription(desc) {
  return desc.replace("NTT INDYCAR SERIES - ", "").trim();
}

function convertToUTC(dayStr, timeStr, year) {
  try {
    if (!timeStr) return null;

    const cleanTime = timeStr.replace(" ET", "").trim();

    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return null;

    return dt.toUTC().toISO();
  } catch {
    return null;
  }
}

// ✅ NEW: keep ET as "local"
function convertToLocalET(dayStr, timeStr, year) {
  try {
    if (!timeStr) return null;

    const cleanTime = timeStr.replace(" ET", "").trim();

    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return null;

    return dt.toISO(); // stays in ET
  } catch {
    return null;
  }
}

// ✅ NEW: timezone label
function getEventTimezone(dayStr, timeStr, year) {
  try {
    const cleanTime = timeStr.replace(" ET", "").trim();

    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone: "America/New_York",
    });

    if (!dt.isValid) return "UTC+00:00";

    const offset = dt.offset;

    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);

    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const mins = String(abs % 60).padStart(2, "0");

    return `UTC${sign}${hours}:${mins}`;
  } catch {
    return "UTC+00:00";
  }
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

      const startUTC = convertToUTC(s.day, s.time, year);
      const startLocal = convertToLocalET(s.day, s.time, year);

      const sessionObj = {
        event_slug: slug,
        session_name: cleanedDesc,
        session_type: getSessionType(cleanedDesc),

        start_time_utc: startUTC,
        end_time_utc: null,

        // ✅ NEW FIELDS
        start_time_local: startLocal,
        end_time_local: null,
        event_timezone: getEventTimezone(s.day, s.time, year),

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
