require("../../src/config/env");
const axios = require("axios");
const { buildTrackTimes } = require("../../utils/buildTrackTimes");

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
          let offset = "+00:00";

          if (section.controls) {
            const control = section.controls.find(
              (c) => c.type === "StageStart" && c.code === stage.code,
            );

            if (control) {
              // ✅ UTC (force Z)
              if (control.firstCarDueDateTime) {
                utcTime = control.firstCarDueDateTime + "Z";
              }

              // ✅ Extract offset from local time string
              if (control.firstCarDueDateTimeLocal) {
                const match =
                  control.firstCarDueDateTimeLocal.match(/([+-]\d{2}:\d{2})$/);

                if (match) {
                  offset = match[1]; // "+01:00"
                }
              }
            }
          }

          // ✅ Use shared time builder
          const timeData = buildTrackTimes({
            startUtc: utcTime,
            endUtc: null,
            offsetStr: offset,
          });

          stages.push({
            type: "stage",
            external_id: stage.stageId,
            name: stage.name,
            stage_number: stage.number,
            distance: stage.distance,

            start_time: timeData.start_time,
            start_time_local: timeData.start_time_local,
            event_timezone: timeData.event_timezone,

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
