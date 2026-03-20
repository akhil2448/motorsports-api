const axios = require("axios");
const fs = require("fs");
const path = require("path");
const pool = require("../../../db/pool");

const BASE_URL = "https://p-p.redbull.com/rb-wrccom-lintegration-yv-prod/api";

const OUTPUT_DIR = path.join(__dirname, "../../../pdfs");

function ensurePdfDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/* ---------------------------------- */
/* SAFE GET                           */
/* ---------------------------------- */

async function safeGet(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "motorsport-schedule-bot/1.0",
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    return res;
  } catch {
    return null;
  }
}

/* ---------------------------------- */
/* GET UPCOMING EVENTS                */
/* ---------------------------------- */

async function getUpcomingEvents() {
  const res = await pool.query(`
    SELECT id, event_name, slug, start_date, external_event_id
    FROM events
    WHERE series_id = (SELECT id FROM series WHERE short_name = 'WRC')
    AND start_date >= NOW()
    ORDER BY start_date ASC
  `);

  return res.rows;
}

/* ---------------------------------- */
/* FIND PDF VIA API                   */
/* ---------------------------------- */

async function findPdfViaApi(eventId) {
  if (!eventId) return null;

  try {
    const eventRes = await safeGet(`${BASE_URL}/events/${eventId}.json`);

    if (!eventRes || eventRes.status !== 200) return null;

    const rally = eventRes.data.rallies?.find((r) => r.isMain);

    if (!rally || !rally.itineraryId) return null;

    const itinRes = await safeGet(
      `${BASE_URL}/events/${eventId}/itineraries/${rally.itineraryId}.json`,
    );

    if (!itinRes || itinRes.status !== 200) return null;

    const jsonStr = JSON.stringify(itinRes.data);

    const match = jsonStr.match(/https:\/\/[^\s"]+\.pdf/i);

    return match ? match[0] : null;
  } catch {
    return null;
  }
}

/* ---------------------------------- */
/* FIND PDF VIA HTML                  */
/* ---------------------------------- */

async function findPdfViaHtml(slug) {
  if (!slug) return null;

  const url = `https://www.wrc.com/en/events/${slug}/itinerary-${slug}`;

  const res = await safeGet(url);

  if (!res || res.status !== 200) return null;

  const html = res.data;

  const match = html.match(/https:\/\/[^\s"]+\.pdf/i);

  return match ? match[0] : null;
}

/* ---------------------------------- */
/* FIND PDF URL                       */
/* ---------------------------------- */

async function findPdfUrl(slug, eventId) {
  const apiUrl = await findPdfViaApi(eventId);
  if (apiUrl) return apiUrl;

  return await findPdfViaHtml(slug);
}

/* ---------------------------------- */
/* DOWNLOAD PDF                       */
/* ---------------------------------- */

async function downloadPdf(url, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 20000,
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const writer = fs.createWriteStream(filePath);

  res.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(filePath));
    writer.on("error", reject);
  });
}

/* ---------------------------------- */
/* MAIN FUNCTION                      */
/* ---------------------------------- */

async function fetchLatestPdf() {
  ensurePdfDir();
  const events = await getUpcomingEvents();

  if (!events.length) {
    console.log("No upcoming events found");
    return null;
  }

  for (const event of events) {
    const { event_name, slug, external_event_id } = event;

    console.log("\n=================================");
    console.log("EVENT:", event_name);

    const pdfUrl = await findPdfUrl(slug, external_event_id);

    if (!pdfUrl) {
      console.log("No PDF found");
      continue;
    }

    console.log("PDF URL:", pdfUrl);

    const safeName = slug.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${safeName}.pdf`;

    const filePath = await downloadPdf(pdfUrl, filename);

    console.log("Downloaded:", filename);

    return {
      event,
      filePath,
      pdfUrl,
    };
  }

  return null;
}

module.exports = {
  fetchLatestPdf,
  findPdfUrl,
};
