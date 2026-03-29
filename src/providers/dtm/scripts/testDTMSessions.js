const { DateTime } = require("luxon");
const axios = require("axios");

const BASE_API = "https://api.dtm.com/data";

/**
 * 🌍 Country → Timezone mapping
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

const FALLBACK_TIMEZONE = "Europe/Berlin";

/**
 * Resolve timezone
 */
function getTimezone(countryCode, city, slug) {
  const tz = COUNTRY_TIMEZONES[countryCode];

  if (!tz) {
    console.warn(
      `⚠️ Unknown timezone for ${city} (${countryCode}) in ${slug}. Using fallback ${FALLBACK_TIMEZONE}`,
    );
    return FALLBACK_TIMEZONE;
  }

  return tz;
}

/**
 * Fetch event details
 */
async function fetchEventDetails(slug) {
  const url = `${BASE_API}?query=eventDetails&slug=${slug}&lang=en`;
  const { data } = await axios.get(url);
  return data.events?.[0] || null;
}

/**
 * MAIN TEST
 */
async function testDTM(year = "2025") {
  try {
    const url = `${BASE_API}?query=events&lang=en`;
    const { data } = await axios.get(url);

    const events = data.events.filter((e) => e.eventCategory?.includes(year));

    events.sort((a, b) => a.eventNumber - b.eventNumber);

    // 👉 Test ONLY 1 event (Red Bull Ring ideally)
    const event = events.find((e) => e.slug.includes("red-bull-ring"));

    if (!event) {
      console.log("❌ Test event not found");
      return;
    }

    console.log(`\n==== TESTING EVENT: ${event.slug} ====\n`);

    const details = await fetchEventDetails(event.slug);

    const timezone = getTimezone(
      event.country?.countryCode,
      details.city,
      event.slug,
    );

    const timetable = details.timetable || [];

    if (!timetable.length) {
      console.log("❌ No timetable available");
      return;
    }

    const dtmSessions = timetable.filter((t) => t?.raceSeries === "DTM");

    console.log(`Timezone: ${timezone}\n`);

    dtmSessions.forEach((s, index) => {
      const utc = DateTime.fromISO(s.start, { zone: "utc" });
      const local = utc.setZone(timezone);

      const offset = `UTC${local.toFormat("ZZ")}`;

      console.log("=================================");
      console.log(`Session: ${s.label}`);
      console.log(`UTC:     ${utc.toISO()}`);
      console.log(`Local:   ${local.toISO()}`);
      console.log(`Offset:  ${offset}`);
      console.log("=================================\n");
    });
  } catch (err) {
    console.error("❌ Test error:", err.message);
  }
}

// 👇 run
testDTM("2025");
