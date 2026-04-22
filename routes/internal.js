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

/**
 * 🧹 CLEANUP INACTIVE USERS (monthly)
 */
router.post("/cleanup-users", verifyCron, async (req, res) => {
  try {
    console.log("🧹 User cleanup started");

    const result = await db.query(`
      DELETE FROM users u
      WHERE u.id IN (
        SELECT u.id
        FROM users u
        WHERE u.created_at < NOW() - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM push_subscriptions ps
          WHERE ps.user_id = u.id
        )
        AND (
          NOT EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.user_id = u.id
          )
          OR EXISTS (
            SELECT 1 FROM user_preferences up
            WHERE up.user_id = u.id
              AND (
                up.followed_series IS NULL
                OR up.followed_series = '{}'
                OR array_length(up.followed_series, 1) IS NULL
                OR array_length(up.followed_series, 1) = 0
              )
          )
        )
        LIMIT 100
      )
      RETURNING id;
    `);

    console.log(`🧹 Deleted users: ${result.rowCount}`);

    res.json({
      status: "cleanup-complete",
      deleted: result.rowCount,
    });
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
    res.status(500).json({ error: "cleanup-failed" });
  }
});

module.exports = router;
