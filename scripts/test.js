const axios = require("axios");

const endpoints = [
  "/season/2026",
  "/events/2026",
  "/events",
  "/calendar/2026",
  "/championship/2026",
  "/rallies/2026",
];

async function test() {
  for (const ep of endpoints) {
    const url = "https://api-next.ewrc-results.com" + ep;

    try {
      const res = await axios.get(url, { timeout: 5000 });

      console.log("\nSUCCESS:", ep);
      console.log(JSON.stringify(res.data).slice(0, 300));
    } catch (err) {
      console.log("FAILED:", ep);
    }
  }
}

test();
