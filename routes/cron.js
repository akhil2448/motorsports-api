const pool = require("../db/pool");

const express = require("express");
const router = express.Router();

/**
 * GET /api/cron/run-notifications
 */
router.get("/run-notifications", async (req, res) => {
  try {
    const now = new Date();

    // ✅ Fetch user preferences
    const result = await pool.query(`
      SELECT up.user_id, up.followed_series, up.notify_before_minutes, up.notify_event_start
      FROM user_preferences up
      JOIN users u ON u.id = up.user_id
    `);

    const preferences = result.rows;

    if (!preferences.length) {
      console.log("No users → skipping cron");
      return res.json({ status: "no-users" });
    }

    // ✅ Fetch upcoming units (7 days for testing)
    const { rows: units } = await pool.query(`
      SELECT
      uv.*,
      e.event_name,
      s.short_name AS series
    FROM units_view uv
    JOIN events e ON uv.event_id = e.id
    JOIN series s ON e.series_id = s.id
    WHERE uv.start_time >= NOW() - INTERVAL '5 minutes'
    AND uv.start_time <= NOW() + INTERVAL '90 minutes'
    ORDER BY uv.start_time ASC
    `);

    console.log(`👥 Users: ${preferences.length}`);
    console.log(`🏁 Units fetched: ${units.length}`);

    if (!units.length) {
      console.log("No upcoming units → skipping");
      return res.json({ status: "no-units" });
    }

    for (const user of preferences) {
      const {
        user_id,
        followed_series,
        notify_before_minutes,
        notify_event_start,
      } = user;

      // ✅ Filter by series (normalized)
      const normalizedFollowed = (followed_series || []).map((series) =>
        series.trim().toLowerCase(),
      );

      const userUnits = units.filter((unit) => {
        const unitSeries = unit.series?.trim().toLowerCase();
        const match = normalizedFollowed.includes(unitSeries);

        return match;
      });

      if (!userUnits.length) continue;

      // ✅ Time-based filtering
      const eligibleUnits = userUnits.filter((unit) => {
        const startTime = new Date(unit.start_time);

        const diffMinutes = (startTime - now) / (1000 * 60);

        const shouldNotifyBefore =
          diffMinutes > 0 && diffMinutes <= notify_before_minutes;

        const shouldNotifyStart =
          notify_event_start && diffMinutes <= 0 && diffMinutes >= -5; // small buffer

        return shouldNotifyBefore || shouldNotifyStart;
      });

      console.log(
        `⏱ User ${user_id} → eligible units: ${eligibleUnits.length}`,
      );

      // ✅ Insert notifications
      for (const unit of eligibleUnits) {
        const startTime = new Date(unit.start_time);
        const diffMinutes = (startTime - now) / (1000 * 60);

        let type = null;

        if (diffMinutes > 0 && diffMinutes <= notify_before_minutes) {
          type = "BEFORE";
        } else if (
          notify_event_start &&
          diffMinutes <= 0 &&
          diffMinutes >= -5
        ) {
          type = "START";
        }

        if (!type) continue;

        const dedupeKey = `${user_id}-${unit.unit_id}-${type}`;

        await pool.query(
          `
  INSERT INTO notifications (
    user_id,
    series_id,
    event_id,
    type,
    title,
    message,
    data,
    dedupe_key
  )
  VALUES (
    $1,
    (SELECT id FROM series WHERE short_name = $2),
    $3,
    $4,
    '',  -- ✅ EMPTY (computed later)
    '',  -- ✅ EMPTY (computed later)
    $5,
    $6
  )
  ON CONFLICT (dedupe_key) DO NOTHING
  `,
          [
            user_id,
            unit.series,
            unit.event_id,
            type,
            JSON.stringify({
              unit_id: unit.unit_id,
              name: unit.name,
              series: unit.series,
              event_name: unit.event_name,
              start_time: unit.start_time,
            }),
            dedupeKey,
          ],
        );
      }
    }

    return res.json({
      status: "ok",
      users_count: preferences.length,
      total_units: units.length,
      message: "Notification engine executed",

      // 🔥 CRITICAL for KV optimization
      next_session_time: units.length ? units[0].start_time : null,
    });
  } catch (error) {
    console.error("❌ Cron error FULL:", error);
    console.error("❌ Cron error MESSAGE:", error.message);
    console.error("❌ Cron error STACK:", error.stack);

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

module.exports = router;
