require("../../src/config/env");
const axios = require("axios");

const BASE_URL = "https://p-p.redbull.com/rb-wrccom-lintegration-yv-prod/api";

const competitiveStageTypes = [
  "SpecialStage",
  "SuperSpecialStage",
  "PowerStage",
];

/* ---------------------------------- */
/* FETCH STAGES FOR EVENT             */
/* ---------------------------------- */

async function fetchStages(eventId) {
  try {
    const eventRes = await axios.get(`${BASE_URL}/events/${eventId}.json`);

    const rally = eventRes.data.rallies?.find((r) => r.isMain);
    if (!rally || !rally.itineraryId) return [];

    const itineraryRes = await axios.get(
      `${BASE_URL}/events/${eventId}/itineraries/${rally.itineraryId}.json`,
    );

    const legs = itineraryRes.data.itineraryLegs;

    const stages = [];

    for (const leg of legs || []) {
      for (const section of leg.itinerarySections || []) {
        for (const stage of section.stages || []) {
          if (!competitiveStageTypes.includes(stage.stageType)) continue;

          let utcTime = null;
          let localTime = null;
          let timezone = null;

          if (section.controls) {
            const control = section.controls.find(
              (c) => c.type === "StageStart" && c.code === stage.code,
            );

            if (control) {
              // ✅ UTC (force Z to make it explicit)
              if (control.firstCarDueDateTime) {
                utcTime = control.firstCarDueDateTime + "Z";
              }

              // ✅ Local + timezone
              if (control.firstCarDueDateTimeLocal) {
                localTime = control.firstCarDueDateTimeLocal;

                // Extract timezone (e.g., +01:00)
                const match =
                  control.firstCarDueDateTimeLocal.match(/([+-]\d{2}:\d{2})$/);

                timezone = match ? `UTC${match[1]}` : null;
              }
            }
          }

          stages.push({
            type: "stage",
            external_id: stage.stageId,
            name: stage.name,
            stage_number: stage.number,
            distance: stage.distance,

            // 👇 IMPORTANT
            start_time: utcTime, // goes to start_time_utc
            start_time_local: localTime,
            event_timezone: timezone,

            order: stage.number,
          });
        }
      }
    }

    return stages;
  } catch (err) {
    console.log(`Failed to fetch stages for event ${eventId}`);
    return [];
  }
}

/* ---------------------------------- */
/* MAIN FETCH                         */
/* ---------------------------------- */

async function fetch() {
  const currentYear = new Date().getFullYear();

  const seasonsRes = await axios.get(`${BASE_URL}/seasons.json`, {
    timeout: 15000,
  });

  const season = seasonsRes.data.find(
    (s) => s.year === currentYear && s.name === "World Rally Championship",
  );

  if (!season) {
    throw new Error(`No WRC season found for ${currentYear}`);
  }

  const championshipId = 333;

  const champRes = await axios.get(
    `${BASE_URL}/championship-detail.json?championshipId=${championshipId}&seasonId=${season.seasonId}`,
  );

  const rounds = champRes.data.championshipRounds;

  const events = [];

  for (const round of rounds) {
    const event = round.event;

    const stages = await fetchStages(event.eventId);

    events.push({
      external_id: event.eventId,
      name: event.name,
      location: event.location,
      country: event.country?.name || null,
      start_date: event.startDate,
      end_date: event.finishDate,
      round: round.order,
      units: stages,
    });
  }

  return {
    series: {
      name: "World Rally Championship",
      short_name: "WRC",
    },
    events,
  };
}

module.exports = { fetch };
