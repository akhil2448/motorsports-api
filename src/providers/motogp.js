const axios = require("axios");

const BASE_URL = "https://api.pulselive.motogp.com/motogp/v1";

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
      .map((s) => ({
        type: "session",
        external_id: s.id,
        name: normalizeSessionName(s.name),
        session_type: s.kind,
        start_time: s.date_start,
        end_time: s.date_end,
        order: s.progressive,
      }));

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
