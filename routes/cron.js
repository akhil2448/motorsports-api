const pool = require("../db/pool");

const express = require("express");
const router = express.Router();

/**
 * GET /api/cron/run-notifications
 */
router.get("/run-notifications", async (req, res) => {
  try {
    console.log("🕒 Cron triggered: run-notifications");

    // ✅ Fetch user preferences
    const { rows: preferences } = await pool.query(`
      SELECT user_id, followed_series, notify_before_minutes, notify_event_start
      FROM user_preferences
    `);

    console.log(`👥 Users loaded: ${preferences.length}`);

    return res.json({
      status: "ok",
      users_count: preferences.length,
      sample: preferences[0] || null, // debug
    });
  } catch (error) {
    console.error("Cron error:", error);
    return res.status(500).json({
      status: "error",
      message: "Cron failed",
    });
  }
});

module.exports = router;
