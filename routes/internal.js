const express = require("express");
const router = express.Router();

const {
  ingestLatestPdfStages,
} = require("../src/services/wrc/wrcStageService");

router.get("/wrc-pdf", async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "unauthorized" });
  }

  console.log("🌐 External cron triggered WRC ingestion");

  // ✅ Run in background (DON'T await)
  ingestLatestPdfStages()
    .then(() => console.log("✅ Background ingestion completed"))
    .catch((err) =>
      console.error("❌ Background ingestion failed:", err.message),
    );

  // ✅ Respond immediately (< 1 second)
  res.json({ status: "triggered" });
});

module.exports = router;
