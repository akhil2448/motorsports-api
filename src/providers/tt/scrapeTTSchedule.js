const puppeteer = require("puppeteer");

const URL = "https://www.iomttraces.com/racing/page/schedule/";

async function scrapeTT() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded" });

  const data = await page.evaluate(() => {
    const tables = document.querySelectorAll("article table");

    const sessions = [];
    let currentPhase = null;

    tables.forEach((table) => {
      const header = table.querySelector("h5")?.innerText.toLowerCase();

      if (header?.includes("qualifying")) currentPhase = "qualifying";
      if (header?.includes("race")) currentPhase = "race";

      const rows = table.querySelectorAll("tr");

      rows.forEach((row) => {
        const cols = row.querySelectorAll("td");
        if (cols.length < 2) return;

        const leftText = cols[0].innerText.trim();
        const rightCol = cols[1];

        const dateMatch = leftText.match(
          /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+(\w+)/i,
        );

        if (!dateMatch) return;

        const [, day, date, month] = dateMatch;

        const lines = Array.from(rightCol.querySelectorAll("p"))
          .map((p) => p.innerText.trim())
          .filter(Boolean);

        let currentGroup = null;

        lines.forEach((text) => {
          // =========================
          // GROUP DETECTION
          // =========================
          if (/qualifying\s*\d+/i.test(text)) {
            currentGroup = text.trim();
            return;
          }

          if (/free practice/i.test(text)) {
            currentGroup = "Free Practice";
            return;
          }

          // =========================
          // SESSION LINE
          // =========================
          const match = text.match(/(\d{1,2}:\d{2})\s*–\s*(.+)/);
          if (!match) return;

          const [, time, nameRaw] = match;

          // ❌ skip Free Practice
          if (currentGroup === "Free Practice") return;

          // ❌ skip Shakedown (FIXED)
          if (/shakedown/i.test(nameRaw)) return;

          // ❌ filter noise
          if (
            /mountain section|road|closed|re-open|course closed/i.test(nameRaw)
          ) {
            return;
          }

          // ❌ remove practice sessions in race week
          if (currentPhase === "race" && /practice/i.test(nameRaw)) {
            return;
          }

          // =========================
          // CLEAN NAME
          // =========================
          const name = nameRaw
            .replace(/\s*\[.*?\]/g, "")
            .replace(/\s*–\s*$/g, "")
            .trim();

          sessions.push({
            phase: currentPhase,
            group: currentGroup,
            day,
            date,
            month,
            time,
            name,
          });
        });
      });
    });

    const lastUpdatedMatch =
      document.body.innerText.match(/Last updated:\s*(.+)/i);

    return {
      sessions,
      lastUpdated: lastUpdatedMatch?.[1]?.trim() || null,
    };
  });

  console.log("\n=== LAST UPDATED ===");
  console.log(data.lastUpdated);

  console.log("\n=== SESSIONS ===");
  console.table(data.sessions);

  await browser.close();

  return data;
}

module.exports = scrapeTT;

// optional direct run
if (require.main === module) {
  scrapeTT().catch(console.error);
}
