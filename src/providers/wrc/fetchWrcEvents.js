const axios = require("axios");
const pool = require("../../../db/pool");

const SERIES_ID = 2; // WRC (based on your DB)

const countries = require("i18n-iso-countries");
const enLocale = require("i18n-iso-countries/langs/en.json");
countries.registerLocale(enLocale);

// --- Dynamic year (no hardcoding)
function getYearsToCheck() {
  const year = new Date().getFullYear();
  return [year, year + 1];
}

// --- Clean event name (remove sponsors before "Rally"/"Rallye")
function cleanEventName(name) {
  if (!name) return "";

  let cleaned = name.trim();

  // --- 1. If dual naming (split by " - "), keep FIRST part
  if (cleaned.includes(" - ")) {
    cleaned = cleaned.split(" - ")[0].trim();
  }

  // --- 2. Remove sponsor prefixes BEFORE "Rally"
  const rallyIndex = cleaned.toLowerCase().indexOf("rally");

  if (rallyIndex > 0) {
    // Check if prefix is likely sponsor (all caps / brand-like)
    const prefix = cleaned.slice(0, rallyIndex).trim();

    const isSponsor =
      prefix === prefix.toUpperCase() || // FORUM8
      /^[A-Z0-9]+$/.test(prefix); // EKO, WRC, etc.

    if (isSponsor) {
      cleaned = cleaned.slice(rallyIndex).trim();
    }
  }

  // --- 3. Normalize spacing
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned;
}

function getCountryName(countryObj) {
  if (!countryObj) return null;

  const iso3 = countryObj.shortcut;
  const iso2 = countryObj.flag?.toUpperCase();

  // --- 1. Try ISO3
  let name = countries.getName(iso3, "en");
  if (name) return name;

  // --- 2. Try ISO2 (fallback)
  if (iso2) {
    name = countries.getName(iso2, "en");
    if (name) return name;
  }

  // --- 3. Final fallback
  return iso3 || iso2 || null;
}

// --- Fetch WRC events (source of truth)
async function fetchWRCEvents(year) {
  const url = `https://api-next.ewrc-results.com/ranking/${year}/teams?sct=1`;
  const res = await axios.get(url);

  return res.data.events || [];
}

// --- Fetch calendar (for dates)
async function fetchCalendar(year) {
  const url = `https://api-next.ewrc-results.com/calendar/${year}/list`;
  const res = await axios.get(url);

  return res.data || [];
}

// --- Build lookup map from calendar
function buildCalendarMap(calendarData) {
  const map = new Map();

  calendarData.forEach((week) => {
    (week.events || []).forEach((event) => {
      map.set(event.id, event);
    });
  });

  return map;
}

// --- UPSERT query
async function upsertEvent(event) {
  const query = `
INSERT INTO events (
  series_id,
  event_name,
  country,
  start_date,
  end_date,
  round_number,
  ewrc_event_id
)
VALUES ($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT (ewrc_event_id)
DO UPDATE SET
  event_name = EXCLUDED.event_name,
  country = EXCLUDED.country,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  round_number = EXCLUDED.round_number
`;

  const values = [
    SERIES_ID,
    event.event_name,
    event.country,
    event.start_date,
    event.end_date,
    event.round_number,
    event.ewrc_event_id,
  ];

  await pool.query(query, values);
}

// --- MAIN FUNCTION
async function fetchWrcEvents() {
  console.log("🔄 Syncing WRC events...");

  const years = getYearsToCheck();

  for (const year of years) {
    console.log(`📅 Processing year: ${year}`);

    const [rankingEvents, calendarData] = await Promise.all([
      fetchWRCEvents(year),
      fetchCalendar(year),
    ]);

    const calendarMap = buildCalendarMap(calendarData);

    for (const event of rankingEvents) {
      const calendarEvent = calendarMap.get(event.id);

      if (!calendarEvent) {
        console.warn(`⚠️ No calendar data for event ${event.id}`);
        continue;
      }

      const normalized = {
        ewrc_event_id: String(event.id),
        event_name: cleanEventName(event.name),
        country: getCountryName(event.country),
        start_date: calendarEvent.from,
        end_date: calendarEvent.until,
        round_number: event.round,
      };

      try {
        await upsertEvent(normalized);
        console.log(`✅ Upserted: ${normalized.event_name}`);
      } catch (err) {
        console.error(`❌ Failed for ${event.id}`, err.message);
      }
    }
  }

  console.log("✅ WRC events sync complete");
}

if (require.main === module) {
  fetchWrcEvents();
}

module.exports = fetchWrcEvents;
