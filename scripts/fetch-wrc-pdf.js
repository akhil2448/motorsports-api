const { fetchLatestPdf } = require("../src/services/wrc/wrcPdfService");

async function run() {
  const result = await fetchLatestPdf();

  if (!result) {
    console.log("\nNo PDF available");
    return;
  }

  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
