require("../src/config/env");
const axios = require("axios");
const pool = require("../db/pool");

const { fetchCalendarEvents } = require("../src/scrapers/wrcCalendarScraper");

const BASE_URL = "https://p-p.redbull.com/rb-wrccom-lintegration-yv-prod/api";

/* ---------------------------------- */
/* SERIES                             */
/* ---------------------------------- */

async function getSeriesId() {
  const res = await pool.query(
    `SELECT id FROM series WHERE short_name = 'WRC'`,
  );

  if (!res.rows.length) {
    throw new Error("WRC series not found in DB");
  }

  return res.rows[0].id;
}

/* ---------------------------------- */
/* STEP 1: FETCH EVENTS FROM API      */
/* ---------------------------------- */

async function fetchApiEvents() {
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

  return rounds.map((round) => {
    const e = round.event;

    return {
      external_event_id: String(e.eventId),
      event_name: e.name,
      location: e.location,
      country: e.country?.name || null,
      start_date: e.startDate,
      end_date: e.finishDate,
      round_number: round.order,
    };
  });
}

/* ---------------------------------- */
/* STEP 2: UPSERT EVENTS              */
/* ---------------------------------- */

async function upsertEvents(seriesId, events) {
  for (const e of events) {
    await pool.query(
      `
      INSERT INTO events
      (series_id, external_event_id, event_name, location, country, start_date, end_date, round_number)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (series_id, external_event_id)
      DO UPDATE SET
        event_name = EXCLUDED.event_name,
        location = EXCLUDED.location,
        country = EXCLUDED.country,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        round_number = EXCLUDED.round_number
      `,
      [
        seriesId,
        e.external_event_id,
        e.event_name,
        e.location,
        e.country,
        e.start_date,
        e.end_date,
        e.round_number,
      ],
    );
  }

  console.log(`Upserted ${events.length} events from API`);
}

/* ---------------------------------- */
/* STEP 3: MAP SLUGS USING SCRAPER    */
/* ---------------------------------- */

async function mapSlugToEvents(seriesId, calendarEvents) {
  for (const cal of calendarEvents) {
    const res = await pool.query(
      `
      UPDATE events
      SET slug = $1
      WHERE series_id = $2
      AND start_date BETWEEN $3::date - INTERVAL '3 days'
                          AND $3::date + INTERVAL '3 days'
      AND slug IS NULL
      RETURNING event_name
      `,
      [cal.slug, seriesId, cal.start_date],
    );

    if (res.rowCount > 0) {
      console.log(`Mapped slug ${cal.slug} → ${res.rows[0].event_name}`);
    }
  }
}

/* ---------------------------------- */
/* MAIN                               */
/* ---------------------------------- */

async function run() {
  const seriesId = await getSeriesId();

  console.log("Fetching API events...");
  const apiEvents = await fetchApiEvents();

  await upsertEvents(seriesId, apiEvents);

  console.log("Fetching calendar events...");
  const calendarEvents = await fetchCalendarEvents();

  console.log(`Found ${calendarEvents.length} calendar events`);

  await mapSlugToEvents(seriesId, calendarEvents);

  console.log("Done");
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
