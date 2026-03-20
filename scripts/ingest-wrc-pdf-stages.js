const {
  ingestLatestPdfStages,
} = require("../src/services/wrc/wrcStageService");

async function run() {
  await ingestLatestPdfStages();
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
