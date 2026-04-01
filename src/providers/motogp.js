require("../../src/config/env");
const axios = require("axios");
const { buildTrackTimes } = require("../../utils/buildTrackTimes");

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

/* =========================
   OFFSET NORMALIZATION (MotoGP specific)
========================= */

// "+0200" → "+02:00"
function normalizeOffsetFormat(offset) {
  if (!offset) return "+00:00";

  const match = offset.match(/([+-]\d{2})(\d{2})$/);
  if (!match) return "+00:00";

  return `${match[1]}:${match[2]}`;
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

        const end = start === endRaw ? null : endRaw;

        // extract "+0200"
        const offsetMatch = start?.match(/([+-]\d{4})$/);
        const rawOffset = offsetMatch ? offsetMatch[1] : "+0000";

        // normalize → "+02:00"
        const normalizedOffset = normalizeOffsetFormat(rawOffset);

        const timeData = buildTrackTimes({
          startUtc: start,
          endUtc: end,
          offsetStr: normalizedOffset,
        });

        return {
          type: "session",
          external_id: s.id,
          name: normalizeSessionName(s.name),
          session_type: s.kind,

          ...timeData,

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
