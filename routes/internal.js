const express = require("express");
const router = express.Router();

const {
  updateWRCStages,
} = require("../src/providers/wrc/cron/updateWrcStages");

const {
  updateUpcomingEvents,
} = require("../src/providers/indycar/cron/updateUpcomingEvents");

const {
  updateDtmSessions,
} = require("../src/providers/dtm/cron/updateDtmSessions");

const {
  updateGTWCSessions,
} = require("../src/providers/gtwc/cron/updateGTWCSessions");

const { ingestTT } = require("../src/providers/tt/ingestTT");

/**
 * 🔒 Middleware for cron auth
 */
function verifyCron(req, res, next) {
  const cronSecret = req.headers["x-cron-secret"];

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "unauthorized" });
  }

  next();
}

/**
 * 🚀 UNIFIED INGESTION (non-blocking)
 */
router.post("/run-ingestion", verifyCron, async (req, res) => {
  console.log("🌐 Ingestion cron triggered");

  // 🔥 Run ALL jobs in background (non-blocking)
  Promise.allSettled([
    updateWRCStages(),
    updateUpcomingEvents(),
    updateDtmSessions(),
    updateGTWCSessions(),
    ingestTT(),
  ])
    .then((results) => {
      console.log("✅ Ingestion completed");

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`❌ Job ${i} failed:`, r.reason?.message);
        }
      });
    })
    .catch((err) => {
      console.error("❌ Ingestion error:", err.message);
    });

  // ✅ RETURN IMMEDIATELY (CRITICAL)
  res.json({ status: "Ingestion triggered" });
});

module.exports = router;
