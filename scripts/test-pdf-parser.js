const path = require("path");
const { parseWrcPdf } = require("../services/wrc-pdf-parser.service");

async function run() {
  const filePath = path.join(__dirname, "../pdfs/wrc_croatia_rally_2026.pdf");

  const stages = await parseWrcPdf(filePath);

  console.log("Parsed stages:\n");

  for (const s of stages.slice(0, 10)) {
    console.log(s);
  }

  console.log(`\nTotal stages: ${stages.length}`);
}

run();
