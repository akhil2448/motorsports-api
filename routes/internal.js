const express = require("express");
const router = express.Router();

const {
  ingestLatestPdfStages,
} = require("../src/services/wrc/wrcStageService");

const {
  updateUpcomingEvents,
} = require("../src/providers/indycar/cron/updateUpcomingEvents");

const {
  updateDtmSessions,
} = require("../src/providers/dtm/cron/updateDtmSessions");

const {
  updateGTWCSessions,
} = require("../src/providers/gtwc/cron/updateGTWCSessions"); // ✅ NEW

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
 * WRC PDF ingestion (background)
 */
router.get("/wrc-pdf", verifyCron, async (req, res) => {
  console.log("🌐 WRC cron triggered");

  ingestLatestPdfStages()
    .then(() => console.log("✅ WRC ingestion completed"))
    .catch((err) => console.error("❌ WRC ingestion failed:", err.message));

  res.json({ status: "WRC triggered" });
});

/**
 * IndyCar schedule update
 */
router.get("/indycar-update", verifyCron, async (req, res) => {
  console.log("🌐 IndyCar cron triggered");

  try {
    await updateUpcomingEvents();
    res.json({ status: "IndyCar completed" });
  } catch (err) {
    console.error("❌ IndyCar cron failed:", err);
    res.status(500).json({ error: "IndyCar cron failed" });
  }
});

/**
 * DTM schedule update
 */
router.get("/dtm-update", verifyCron, async (req, res) => {
  console.log("🌐 DTM cron triggered");

  try {
    await updateDtmSessions();
    res.json({ status: "DTM completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DTM cron failed" });
  }
});

/**
 * GTWC schedule update (NEW)
 */
router.get("/gtwc-update", verifyCron, async (req, res) => {
  console.log("🌐 GTWC cron triggered");

  try {
    await updateGTWCSessions();
    res.json({ status: "GTWC completed" });
  } catch (err) {
    console.error("❌ GTWC cron failed:", err);
    res.status(500).json({ error: "GTWC cron failed" });
  }
});

module.exports = router;
