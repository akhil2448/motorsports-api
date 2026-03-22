const express = require("express");
const router = express.Router();

const {
  ingestLatestPdfStages,
} = require("../src/services/wrc/wrcStageService");

router.get("/wrc-pdf", async (req, res) => {
  // 🔐 Security check
  if (req.query.key !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "unauthorized" });
  }

  try {
    console.log("🌐 External cron triggered WRC ingestion");

    await ingestLatestPdfStages();

    res.json({ status: "success" });
  } catch (err) {
    console.error("❌ Cron failed:", err.message);
    res.status(500).json({ error: "cron failed" });
  }
});

module.exports = router;
