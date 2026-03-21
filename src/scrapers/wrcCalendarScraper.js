require("../../src/config/env");
const axios = require("axios");

const CALENDAR_URL = "https://www.wrc.com/en/calendar?rb3TabId=upcoming";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCalendarHtml(attempt = 1) {
  try {
    const res = await axios.get(CALENDAR_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      timeout: 20000,
      validateStatus: () => true,
    });

    if (res.status === 403 && attempt < MAX_RETRIES) {
      console.log("⚠️ 403 detected, retrying...");
      await sleep(RETRY_DELAY);
      return fetchCalendarHtml(attempt + 1);
    }

    return res.data;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
      return fetchCalendarHtml(attempt + 1);
    }
    throw err;
  }
}

function extractCalendarEvents(html) {
  const regex =
    /"(?:uriSlug|slug)":"(wrc-[^"]+)".*?"startDate":"([^"]+)".*?"endDate":"([^"]+)"/gs;

  const events = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    events.push({
      slug: match[1],
      start_date: match[2],
      end_date: match[3],
    });
  }

  return events;
}

async function fetchCalendarEvents() {
  const html = await fetchCalendarHtml();

  console.log("Calendar HTML size:", html.length);

  const events = extractCalendarEvents(html);

  console.log("Detected slugs:", events.length);

  return events;
}

module.exports = {
  fetchCalendarEvents,
};
