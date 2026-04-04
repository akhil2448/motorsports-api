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

    // ✅ Fetch upcoming units (7 days for testing)
    const { rows: units } = await pool.query(`
      SELECT *
      FROM units_view
      WHERE start_time >= NOW()
      AND start_time <= NOW() + INTERVAL '7 days'
      ORDER BY start_time ASC
    `);

    console.log(`👥 Users: ${preferences.length}`);
    console.log(`🏁 Units fetched: ${units.length}`);

    for (const user of preferences) {
      const {
        user_id,
        followed_series,
        notify_before_minutes,
        notify_event_start,
      } = user;

      // ✅ Filter by series
      const userUnits = units.filter((unit) =>
        followed_series.includes(unit.series),
      );

      // ✅ Time-based filtering
      const eligibleUnits = userUnits.filter((unit) => {
        const startTime = new Date(unit.start_time);

        const diffMinutes = (startTime - now) / (1000 * 60);

        // 🔔 Notify BEFORE
        const shouldNotifyBefore =
          diffMinutes > 0 && diffMinutes <= notify_before_minutes;

        // 🔥 Notify EVENT START (5 min early + 2 min late buffer)
        const shouldNotifyEventStart =
          notify_event_start && diffMinutes <= 5 && diffMinutes >= -2;

        return shouldNotifyBefore || shouldNotifyEventStart;
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
          diffMinutes <= 5 &&
          diffMinutes >= -2
        ) {
          type = "START";
        }

        if (!type) continue;

        const dedupeKey = `${user_id}-${unit.unit_id}-${type}`;

        const title =
          type === "BEFORE"
            ? `${unit.event_name} ${unit.name} starting soon`
            : `${unit.event_name} ${unit.name} started`;

        const getTimeLabel = (minutes) => {
          if (minutes > 1440) return `${Math.round(minutes / 1440)} days`;
          if (minutes > 60) return `${Math.round(minutes / 60)} hours`;
          return `${Math.round(minutes)} min`;
        };

        // ✅ Message (structured for frontend parsing)
        const message =
          type === "BEFORE"
            ? `${unit.series}|${unit.event_name}|${unit.name} starting in ${getTimeLabel(diffMinutes)}`
            : `${unit.series}|${unit.event_name}|${unit.name} has started`;

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
            $5,
            $6,
            $7,
            $8
        )
          ON CONFLICT (dedupe_key) DO NOTHING
          `,
          [
            user_id,
            unit.series,
            unit.event_id,
            type,
            title,
            message,
            JSON.stringify(unit),
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
