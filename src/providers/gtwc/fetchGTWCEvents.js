const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.gt-world-challenge-europe.com";

function parseDate(dateText) {
  const parts = dateText.split(",")[1].trim();
  const currentYear = new Date().getFullYear();

  // 🔥 Create LOCAL date first (no timezone shift)
  const d = new Date(`${parts} ${currentYear}`);

  // 🔥 Normalize to UTC midnight manually
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

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
  let city = parts.length >= 2 ? parts[1] : null;

  const location = city && city !== country ? city : country;

  return { location, country };
}

async function getGTWCEventUrls() {
  const { data } = await axios.get(`${BASE_URL}/calendar`);
  const $ = cheerio.load(data);

  const scriptTag = $('script[type="application/ld+json"]').html();
  const json = JSON.parse(scriptTag);

  return json.itemListElement
    .map((item) => item.url)
    .filter((url) => !url.toLowerCase().includes("test"));
}

async function fetchGTWCEvents() {
  const urls = await getGTWCEventUrls();
  const events = [];

  for (const url of urls) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const eventName = $("h2.feature__heading").text().trim();
    const fallbackCountry = $(".feature__subheading-text").text().trim();

    const dateSpans = $(".timetable__caption span");

    if (!dateSpans.length) continue;

    const startDate = parseDate($(dateSpans[0]).text().trim());
    const endDate = parseDate(
      $(dateSpans[dateSpans.length - 1])
        .text()
        .trim(),
    );

    const rawAddress = $(".track-information__span").first().text().trim();
    const { location, country } = cleanLocation(rawAddress);

    const slug = url.split("/event/")[1];

    events.push({
      name: eventName,
      slug,
      location,
      country: country || fallbackCountry,
      start_date: startDate,
      end_date: endDate,
      external_event_id: slug,
    });
  }

  // ✅ Sort events chronologically
  events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  // ✅ Assign round numbers
  events.forEach((event, index) => {
    event.round_number = index + 1;
  });

  return events;
}

module.exports = {
  fetchGTWCEvents,
};
