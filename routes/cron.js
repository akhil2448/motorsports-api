const pool = require("../db/pool");
const express = require("express");
const router = express.Router();

/**
 * 🔒 CRON AUTH (NEW)
 */
function verifyCron(req, res, next) {
  const secret = req.headers["x-cron-secret"];

  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  next();
}

/**
 * GET /api/cron/run-notifications
 * 🔥 SAME LOGIC — but hardened + safe
 * DEPRECATED LOGIC. SPLIT THIS INTO TWO "/next-sessions" and "/generate-notifications" endpoints
 */
router.get("/run-notifications", verifyCron, async (req, res) => {
  try {
    const now = new Date();

    // =====================================
    // 👥 FETCH USERS
    // =====================================
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

    // =====================================
    // 🏁 FETCH UNITS
    // =====================================
    const { rows: units } = await pool.query(`
      SELECT
        uv.*,
        e.event_name,
        s.short_name AS series
      FROM units_view uv
      JOIN events e ON uv.event_id = e.id
      JOIN series s ON e.series_id = s.id
      WHERE uv.start_time >= NOW() - INTERVAL '5 minutes'
      AND uv.start_time <= NOW() + INTERVAL '70 minutes'
      ORDER BY uv.start_time ASC
    `);

    // =====================================
    // ⏭ NEXT SESSION (CRITICAL FOR KV)
    // =====================================
    const { rows: nextSession } = await pool.query(`
      SELECT start_time
      FROM units_view
      WHERE start_time > NOW()
      ORDER BY start_time ASC
      LIMIT 1
    `);

    console.log(`👥 Users: ${preferences.length}`);
    console.log(`🏁 Units fetched: ${units.length}`);

    if (!units.length) {
      console.log("No nearby units → still returning next session");

      return res.json({
        status: "no-units",
        next_session_time: nextSession.length
          ? nextSession[0].start_time
          : null,
      });
    }

    // =====================================
    // 🔁 MAIN LOOP (UNCHANGED LOGIC)
    // =====================================
    for (const user of preferences) {
      const {
        user_id,
        followed_series,
        notify_before_minutes,
        notify_event_start,
      } = user;

      const normalizedFollowed = (followed_series || []).map((series) =>
        series.trim().toLowerCase(),
      );

      const userUnits = units.filter((unit) => {
        const unitSeries = unit.series?.trim().toLowerCase();
        return normalizedFollowed.includes(unitSeries);
      });

      if (!userUnits.length) continue;

      const eligibleUnits = userUnits.filter((unit) => {
        const startTime = new Date(unit.start_time);
        const diffMinutes = (startTime - now) / (1000 * 60);

        const shouldNotifyBefore =
          diffMinutes > 0 && diffMinutes <= notify_before_minutes;

        const shouldNotifyStart =
          notify_event_start && diffMinutes <= 1 && diffMinutes >= -5;

        return shouldNotifyBefore || shouldNotifyStart;
      });

      console.log(
        `⏱ User ${user_id} → eligible units: ${eligibleUnits.length}`,
      );

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

        const title = unit.series;
        let message;

        if (type === "START") {
          message = `${unit.event_name} • ${unit.name} is live`;
        } else {
          const mins = Math.round((startTime - now) / 60000);
          message = `${unit.event_name} • ${unit.name} starting in ${mins} min`;
        }

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

    // =====================================
    // ✅ RESPONSE (CRITICAL FOR WORKER)
    // =====================================
    return res.json({
      status: "ok",
      users_count: preferences.length,
      total_units: units.length,
      message: "Notification engine executed",
      next_session_time: nextSession.length ? nextSession[0].start_time : null,
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

/**
 * 🚀 FAST READ API (for Worker)
 * GET /api/cron/next-sessions
 */
router.get("/next-sessions", async (req, res) => {
  try {
    // lightweight query only
    const { rows: units } = await pool.query(`
      SELECT
        uv.*,
        e.event_name,
        s.short_name AS series
      FROM units_view uv
      JOIN events e ON uv.event_id = e.id
      JOIN series s ON e.series_id = s.id
      WHERE uv.start_time >= NOW() - INTERVAL '5 minutes'
      AND uv.start_time <= NOW() + INTERVAL '70 minutes'
      ORDER BY uv.start_time ASC
    `);

    const { rows: nextSession } = await pool.query(`
      SELECT start_time
      FROM units_view
      WHERE start_time > NOW()
      ORDER BY start_time ASC
      LIMIT 1
    `);

    return res.json({
      units,
      next_session_time: nextSession[0]?.start_time || null,
    });
  } catch (err) {
    console.error("❌ next-sessions failed:", err);
    res.status(500).json({ error: "failed" });
  }
});

/**
 * 🔥 HEAVY WRITE API
 * POST /api/cron/generate-notifications
 */
router.post("/generate-notifications", verifyCron, async (req, res) => {
  try {
    const now = new Date();

    const result = await pool.query(`
      SELECT up.user_id, up.followed_series, up.notify_before_minutes, up.notify_event_start
      FROM user_preferences up
      JOIN users u ON u.id = up.user_id
    `);

    const preferences = result.rows;

    if (!preferences.length) {
      return res.json({ status: "no-users" });
    }

    const { rows: units } = await pool.query(`
      SELECT
        uv.*,
        e.event_name,
        s.short_name AS series
      FROM units_view uv
      JOIN events e ON uv.event_id = e.id
      JOIN series s ON e.series_id = s.id
      WHERE uv.start_time >= NOW() - INTERVAL '5 minutes'
      AND uv.start_time <= NOW() + INTERVAL '70 minutes'
      ORDER BY uv.start_time ASC
    `);

    for (const user of preferences) {
      const {
        user_id,
        followed_series,
        notify_before_minutes,
        notify_event_start,
      } = user;

      const normalizedFollowed = (followed_series || []).map((s) =>
        s.trim().toLowerCase(),
      );

      const userUnits = units.filter((unit) => {
        const unitSeries = unit.series?.trim().toLowerCase();
        return normalizedFollowed.includes(unitSeries);
      });

      if (!userUnits.length) continue;

      const eligibleUnits = userUnits.filter((unit) => {
        const startTime = new Date(unit.start_time);
        const diffMinutes = (startTime - now) / (1000 * 60);

        return (
          (diffMinutes > 0 && diffMinutes <= notify_before_minutes) ||
          (notify_event_start && diffMinutes <= 1 && diffMinutes >= -5)
        );
      });

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

        const title = unit.series;

        const message =
          type === "START"
            ? `${unit.event_name} • ${unit.name} is live`
            : `${unit.event_name} • ${unit.name} starting in ${Math.round(
                diffMinutes,
              )} min`;

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

    res.json({ status: "notifications-generated" });
  } catch (err) {
    console.error("❌ generate-notifications failed:", err);
    res.status(500).json({ error: "failed" });
  }
});

module.exports = router;
