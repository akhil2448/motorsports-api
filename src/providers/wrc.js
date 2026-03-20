const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://p-p.redbull.com/rb-wrccom-lintegration-yv-prod/api";

const competitiveStageTypes = [
  "SpecialStage",
  "SuperSpecialStage",
  "PowerStage",
];

async function fetch() {
  const currentYear = new Date().getFullYear();

  const seasonsRes = await axios.get(`${BASE_URL}/seasons.json`, {
    timeout: 15000,
  });

  const seasons = seasonsRes.data;

  const season = seasons.find(
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

    const externalEventId = event.eventId;

    const eventObj = {
      external_id: externalEventId,
      name: event.name,
      location: event.location,
      country: event.country?.name || null,
      start_date: event.startDate,
      end_date: event.finishDate,
      round: round.order,
      units: [],
    };

    try {
      const eventRes = await axios.get(
        `${BASE_URL}/events/${externalEventId}.json`,
      );

      const rally = eventRes.data.rallies.find((r) => r.isMain);

      if (!rally) {
        events.push(eventObj);
        continue;
      }

      const itineraryId = rally.itineraryId;

      const itineraryRes = await axios.get(
        `${BASE_URL}/events/${externalEventId}/itineraries/${itineraryId}.json`,
      );

      const legs = itineraryRes.data.itineraryLegs;

      if (!legs || legs.length === 0) {
        events.push(eventObj);
        continue;
      }

      for (const leg of legs) {
        for (const section of leg.itinerarySections || []) {
          for (const stage of section.stages || []) {
            if (!competitiveStageTypes.includes(stage.stageType)) continue;

            let startTimeUtc = null;

            if (section.controls) {
              const startControl = section.controls.find(
                (c) => c.type === "StageStart" && c.code === stage.code,
              );

              if (startControl) {
                startTimeUtc = startControl.firstCarDueDateTime;
              }
            }

            eventObj.units.push({
              type: "stage",
              external_id: stage.stageId,
              name: stage.name,
              stage_number: stage.number,
              distance: stage.distance,
              start_time: startTimeUtc,
              order: stage.number,
            });
          }
        }
      }
    } catch (err) {
      console.log(
        `Stages not published yet for event ${event.name}. Attempting scraper...`,
      );

      const scraped = await scrapeItinerary(event.name, currentYear);

      if (scraped) {
        console.log(
          `Scraped itinerary for ${event.name} (Version ${scraped.version})`,
        );
        console.log(scraped.stages);
      }
    }

    events.push(eventObj);
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
