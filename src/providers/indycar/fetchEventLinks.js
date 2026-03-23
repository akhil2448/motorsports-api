const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.indycar.com";

/**
 * Clean event name
 */
function cleanEventName(name) {
  if (!name) return null;

  const match = name.match(/Grand Prix of .*/i);

  return match ? match[0].trim() : name.trim();
}

/**
 * Fetch all IndyCar events with metadata
 */
async function fetchIndycarEvents(year = "2026") {
  try {
    const url = `${BASE_URL}/Schedule`;

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(html);

    const eventsMap = new Map();

    $(".event-card-container").each((_, el) => {
      const linkEl = $(el).find("a.event-card-link");

      const href = linkEl.attr("href");
      if (!href) return;

      const match = href.match(new RegExp(`^/Schedule/${year}/([^/]+)$`));
      if (!match) return;

      const slug = match[1];

      const title = $(el).find(".event-card-title").text().trim();

      const location = $(el).find(".event-card-track-location").text().trim();

      eventsMap.set(slug, {
        url: `${BASE_URL}${href}`,
        slug,
        event_name: cleanEventName(title),
        location,
      });
    });

    const events = Array.from(eventsMap.values());

    console.log(`Found ${events.length} IndyCar events`);

    return events;
  } catch (error) {
    console.error("Error fetching IndyCar events:", error.message);
    throw error;
  }
}

// 👇 test runner
if (require.main === module) {
  (async () => {
    const events = await fetchIndycarEvents("2026");
    console.log(events);
  })();
}

module.exports = { fetchIndycarEvents };
