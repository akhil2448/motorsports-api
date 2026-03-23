const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetch schedule + track details for a single IndyCar event
 */
async function fetchIndycarEventDetails(eventUrl) {
  try {
    const { data: html } = await axios.get(eventUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(html);

    const schedule = [];

    // 🧠 Loop through each day section
    $(".schedule-table h3").each((_, dayEl) => {
      const day = $(dayEl).text().trim();

      // All entries until next <h3>
      let next = $(dayEl).next();

      while (next.length && !next.is("h3")) {
        if (next.hasClass("schedule-entry")) {
          const time = next.find(".schedule-time").text().trim();

          const description = next.find(".schedule-description").text().trim();

          schedule.push({
            day,
            time,
            description,
          });
        }

        next = next.next();
      }
    });

    // 🧠 Track Details
    const trackName = $(".track-details h3").first().text().trim();

    const lapsText = $(".track-stats span").first().text().trim();

    const milesText = $(".track-stats span").last().text().trim();

    const trackDetails = {
      name: trackName,
      laps: lapsText,
      distance: milesText,
    };

    return {
      schedule,
      trackDetails,
    };
  } catch (error) {
    console.error("Error fetching event details:", error.message);
    throw error;
  }
}

// 👇 test runner
if (require.main === module) {
  (async () => {
    const url = "https://www.indycar.com/Schedule/2026/Indianapolis"; // change if needed

    const data = await fetchIndycarEventDetails(url);

    console.log(JSON.stringify(data, null, 2));
  })();
}

module.exports = { fetchIndycarEventDetails };
