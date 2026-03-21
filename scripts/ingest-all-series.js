require("../src/config/env");
const ingestionService = require("../src/services/ingestionService");

const providers = ["f1", "wrc", "motogp"];

async function run() {
  try {
    console.log("Starting motorsport data ingestion...\n");

    for (const name of providers) {
      console.log(`Running provider: ${name}`);

      const provider = require(`../src/providers/${name}`);
      const data = await provider.fetch();

      await ingestionService.ingestSeries(data);

      console.log(`Completed provider: ${name}\n`);
    }

    console.log("All series imported successfully");
  } catch (error) {
    console.error("Error running ingestion:", error);
    process.exit(1);
  }
}

run();
