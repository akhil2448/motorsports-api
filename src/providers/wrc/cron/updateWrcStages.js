const fetchWrcEvents = require("../fetchWrcEvents");
const syncEventMetadata = require("../syncEventMetadata");
const fetchWrcStages = require("../fetchWrcStages");

async function updateWrcStages() {
  console.log("🚀 Starting EWRC daily sync...");

  try {
    await fetchWrcEvents();
    await syncEventMetadata();
    await fetchWrcStages();

    console.log("✅ EWRC sync complete");
  } catch (err) {
    console.error("❌ EWRC sync failed:", err.message);
  }
}

if (require.main === module) {
  updateWrcStages();
}

module.exports = updateWrcStages;
