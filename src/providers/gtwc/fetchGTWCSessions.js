const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");

/**
 * Parse GMT → UTC Date (canonical)
 */
function parseUTCDateTime(dateText, time) {
  const parts = dateText.split(",")[1].trim();
  const currentYear = new Date().getFullYear();

  return new Date(`${parts} ${currentYear} ${time} UTC`);
}

/**
 * Calculate offset (in minutes) between local and GMT
 */
function getOffsetMinutes(localTime, gmtTime) {
  const [lh, lm] = localTime.split(":").map(Number);
  const [gh, gm] = gmtTime.split(":").map(Number);

  return lh * 60 + lm - (gh * 60 + gm);
}

/**
 * Build local timestamptz using derived offset
 */
function buildLocalTimestamp(utcDate, offsetMinutes) {
  return new Date(utcDate.getTime() + offsetMinutes * 60000);
}

/**
 * Normalize session name + type
 */
function normalizeSession(sessionName) {
  const lower = sessionName.toLowerCase();

  // ❌ Ignore unwanted sessions
  if (
    lower.includes("test") ||
    lower.includes("bronze") ||
    lower.includes("pit walk") ||
    lower.includes("spa parade")
  ) {
    return null;
  }

  // ✅ Normalize names
  if (lower.includes("main race")) {
    return { name: "Race", type: "Race" };
  }

  if (lower.includes("race")) {
    return { name: sessionName, type: "Race" };
  }

  if (lower.includes("warm")) {
    return { name: "Warm Up", type: "Warm Up" };
  }

  if (lower.includes("qualifying")) {
    return { name: sessionName, type: "Qualifying" };
  }

  if (lower.includes("practice")) {
    return { name: sessionName, type: "Practice" };
  }

  return { name: sessionName, type: "Other" };
}

async function fetchGTWCSessions(event) {
  const { data } = await axios.get(event.source_url);
  const $ = cheerio.load(data);

  const sessions = [];

  $(".timetable__container").each((_, table) => {
    const dateText = $(table).find(".timetable__caption span").text().trim();

    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const sessionNameRaw = $(row).find("td").eq(0).text().trim();
        const localTime = $(row).find("td").eq(1).text().trim();
        const gmtTime = $(row).find("td").eq(2).text().trim();

        if (!sessionNameRaw || !localTime || !gmtTime) return;

        const normalized = normalizeSession(sessionNameRaw);
        if (!normalized) return;

        // ✅ UTC (canonical)
        const start_time = parseUTCDateTime(dateText, gmtTime);

        // ✅ Derive offset → local timestamptz
        const offsetMinutes = getOffsetMinutes(localTime, gmtTime);
        const local_start_time = buildLocalTimestamp(start_time, offsetMinutes);

        sessions.push({
          name: normalized.name,
          type: normalized.type,
          start_time, // UTC
          local_start_time, // Derived local (timestamptz-ready)
        });
      });
  });

  // ✅ Hash includes BOTH timestamps
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(sessions))
    .digest("hex");

  return {
    event_slug: event.slug,
    sessions,
    hash,
  };
}

module.exports = {
  fetchGTWCSessions,
};
