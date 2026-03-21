require("../src/config/env");

//console.log("DB URL:", process.env.DATABASE_URL);

const ingestionService = require("../src/services/ingestionService");

async function run() {
  const providerName = process.argv[2];

  if (!providerName) {
    console.error("Usage: node ingest-series.js <provider>");
    process.exit(1);
  }

  const provider = require(`../src/providers/${providerName}`);

  console.log(`Running provider: ${providerName}`);

  const data = await provider.fetch();

  await ingestionService.ingestSeries(data);

  console.log("Import complete");
  process.exit(0);
}

run();
