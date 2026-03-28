require("../../src/config/env");
const axios = require("axios");

const BASE_URL = "https://api.pulselive.motogp.com/motogp/v1";

/* =========================
   HELPERS
========================= */

function normalizeMotoGPName(name) {
  if (!name) return null;

  let clean = name
    .replace(/.*GRAND PRIX OF /i, "")
    .replace(/GRAND PRIX OF /i, "")
    .trim()
    .toLowerCase();

  clean = clean.replace(/\b\w/g, (c) => c.toUpperCase());

  return clean + " Grand Prix";
}

function normalizeSessionName(name) {
  if (!name) return name;

  if (name.includes("Free Practice Nr. 1")) return "Practice 1";
  if (name.includes("Free Practice Nr. 2")) return "Practice 2";

  if (name.includes("Qualifying Nr. 1")) return "Qualifying 1";
  if (name.includes("Qualifying Nr. 2")) return "Qualifying 2";

  if (name.includes("Sprint")) return "Sprint";
  if (name.includes("Grand Prix")) return "Race";

  return name.trim();
}

// ✅ "+0200" → "UTC+02:00"
function extractTimezone(offsetString) {
  if (!offsetString) return "UTC+00:00";

  const match = offsetString.match(/([+-]\d{2})(\d{2})$/);
  if (!match) return "UTC+00:00";

  return `UTC${match[1]}:${match[2]}`;
}

function parseOffsetMinutes(offsetString) {
  const match = offsetString.match(/([+-]\d{2})(\d{2})$/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);

  return hours * 60 + (hours >= 0 ? mins : -mins);
}

// ✅ Convert UTC → local using offset
function applyOffset(dateStr, offsetStr) {
  if (!dateStr || !offsetStr) return null;

  const utcDate = new Date(dateStr);
  const offsetMinutes = parseOffsetMinutes(offsetStr);

  return new Date(utcDate.getTime() + offsetMinutes * 60000);
}

/* =========================
   MAIN FETCH
========================= */

async function fetch() {
  const currentYear = new Date().getFullYear();

  const eventsRes = await axios.get(
    `${BASE_URL}/events?seasonYear=${currentYear}`,
    { timeout: 15000 },
  );

  const raceEvents = eventsRes.data.filter((e) => e.kind === "GP");

  const events = [];

  for (const event of raceEvents) {
    const sessions = (event.broadcasts || [])
      .filter((b) => b.type === "SESSION" && b.category?.acronym === "MGP")
      .map((s) => {
        const start = s.date_start;
        const endRaw = s.date_end;

        // ✅ FIX 1: if same → null
        const end = start === endRaw ? null : endRaw;

        // extract "+0200"
        const offsetMatch = start?.match(/([+-]\d{4})$/);
        const offset = offsetMatch ? offsetMatch[1] : "+0000";

        return {
          type: "session",
          external_id: s.id,
          name: normalizeSessionName(s.name),
          session_type: s.kind,

          // ✅ UTC (auto handled by JS)
          start_time: start,
          end_time: end,

          // ✅ LOCAL (computed)
          start_time_local: applyOffset(start, offset),
          end_time_local: end ? applyOffset(end, offset) : null,

          // ✅ TIMEZONE
          event_timezone: extractTimezone(offset),

          order: s.progressive,
        };
      });

    events.push({
      external_id: event.id,
      name: normalizeMotoGPName(event.name),
      location: event.circuit?.name || null,
      country: event.circuit?.country || event.country || null,
      start_date: event.date_start?.split("T")[0],
      end_date: event.date_end?.split("T")[0],
      round: event.sequence,
      units: sessions,
    });
  }

  return {
    series: {
      name: "MotoGP",
      short_name: "MOTOGP",
    },
    events,
  };
}

module.exports = { fetch };
