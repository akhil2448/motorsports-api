const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.gt-world-challenge-europe.com";

/**
 * Extract event URLs from calendar page (JSON-LD)
 */
async function getEventUrls() {
  const { data } = await axios.get(`${BASE_URL}/calendar`);
  const $ = cheerio.load(data);

  const scriptTag = $('script[type="application/ld+json"]').html();
  const json = JSON.parse(scriptTag);

  const urls = json.itemListElement
    .map((item) => item.url)
    .filter((url) => !url.toLowerCase().includes("test"));

  return urls;
}

/**
 * Convert "Friday, 17 July" → Date
 */
function parseDate(dateText) {
  const parts = dateText.split(",")[1].trim();
  const currentYear = new Date().getFullYear();

  const d = new Date(`${parts} ${currentYear}`);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Normalize location
 * Rule:
 * - If city exists → use only city
 * - Else → fallback to country
 */
function cleanLocation(raw) {
  if (!raw) return { location: null, country: null };

  const cleaned = raw.replace(/\s+/g, " ").trim();

  const parts = cleaned
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { location: null, country: null };
  }

  const country = parts[parts.length - 1];

  let city = null;

  // Typical structure: [street, city, postal, region, country]
  if (parts.length >= 2) {
    city = parts[1];
  }

  let location = null;

  if (city && city !== country) {
    location = city; // ✅ only city
  } else {
    location = country; // fallback
  }

  return {
    location,
    country,
  };
}

/**
 * Parse individual event page
 */
async function parseEvent(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const eventName = $("h2.feature__heading").text().trim();
  const fallbackCountry = $(".feature__subheading-text").text().trim();

  const dateSpans = $(".timetable__caption span");

  if (dateSpans.length === 0) return null;

  const firstDate = $(dateSpans[0]).text().trim();
  const lastDate = $(dateSpans[dateSpans.length - 1])
    .text()
    .trim();

  const startDate = parseDate(firstDate);
  const endDate = parseDate(lastDate);

  const rawAddress = $(".track-information__span").first().text().trim();

  const { location, country } = cleanLocation(rawAddress);

  // extract slug from URL
  const slug = url.split("/event/")[1]; // "246/circuit-paul-ricard"

  const sessions = [];

  let currentDate = null;

  $(".timetable__table tbody tr").each((_, row) => {
    const cols = $(row).find("td");

    if (cols.length === 1) {
      // Date row like "Friday, 10 April"
      const text = $(cols[0]).text().trim();
      const parsed = parseDate(text);

      currentDate = DateTime.fromJSDate(parsed).toFormat("yyyy-MM-dd");
      return;
    }

    if (cols.length >= 3 && currentDate) {
      const name = $(cols[0]).text().trim();
      const localTime = $(cols[1]).text().trim();
      const gmtTime = $(cols[2]).text().trim();

      if (!localTime || !gmtTime) return;

      const session = buildSession({
        date: currentDate,
        localTime,
        gmtTime,
        name,
      });

      sessions.push(session);
    }
  });

  return {
    series: "GTWC Europe",
    name: eventName,
    slug,
    country: country || fallbackCountry,
    location,
    start_date: startDate,
    end_date: endDate,
    source_url: url,
    sessions, // ✅ ADD THIS
  };
}

/**
 * Main scraper
 */
async function scrapeGTWCEvents() {
  try {
    const urls = await getEventUrls();

    console.log(`Found ${urls.length} GTWC events`);

    for (const url of urls) {
      const event = await parseEvent(url);

      if (!event) continue;

      console.log("=================================");
      console.log(event);
    }
  } catch (error) {
    console.error("GTWC scrape error:", error.message);
  }
}

module.exports = {
  scrapeGTWCEvents,
};
