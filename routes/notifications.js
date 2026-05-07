const express = require("express");
const router = express.Router();
const db = require("../db/pool");

router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    // pagination cursor (optional)
    const { cursor } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing 'x-user-id'",
      });
    }

    const LIMIT = 20;

    // 🧠 WEEK RANGE
    const now = new Date();

    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    // ============================================
    // 🔥 STEP 1: GET UNREAD COUNT
    // ============================================
    const unreadRes = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1
      AND is_read = false
      AND created_at BETWEEN $2 AND $3
      `,
      [userId, weekStart.toISOString(), weekEnd.toISOString()],
    );

    const unreadCount = parseInt(unreadRes.rows[0].count, 10);

    let notifications = [];
    let hasMore = false;

    // ============================================
    // 🔥 CASE 1: UNREAD > LIMIT → paginate unread only
    // ============================================
    if (unreadCount > LIMIT) {
      const result = await db.query(
        `
        SELECT
          n.id,
          n.type,
          n.title,
          n.message,
          n.data,
          n.created_at,
          n.is_read,
          s.short_name AS series
        FROM notifications n
        JOIN series s ON n.series_id = s.id
        WHERE n.user_id = $1
        AND n.is_read = false
        AND n.created_at BETWEEN $2 AND $3
        ${cursor ? "AND n.created_at < $4" : ""}
        ORDER BY n.created_at DESC
        LIMIT $${cursor ? 5 : 4}
        `,
        cursor
          ? [
              userId,
              weekStart.toISOString(),
              weekEnd.toISOString(),
              cursor,
              LIMIT,
            ]
          : [userId, weekStart.toISOString(), weekEnd.toISOString(), LIMIT],
      );

      notifications = result.rows;
      hasMore = result.rows.length === LIMIT;
    }

    // ============================================
    // 🔥 CASE 2: UNREAD <= LIMIT → unread + read
    // ============================================
    else if (unreadCount > 0) {
      const unreadResult = await db.query(
        `
        SELECT
          n.id,
          n.type,
          n.title,
          n.message,
          n.data,
          n.created_at,
          n.is_read,
          s.short_name AS series
        FROM notifications n
        JOIN series s ON n.series_id = s.id
        WHERE n.user_id = $1
        AND n.is_read = false
        AND n.created_at BETWEEN $2 AND $3
        ORDER BY n.created_at DESC
        `,
        [userId, weekStart.toISOString(), weekEnd.toISOString()],
      );

      const unread = unreadResult.rows;

      const remaining = LIMIT - unread.length;

      let read = [];

      if (remaining > 0) {
        const readResult = await db.query(
          `
          SELECT
            n.id,
            n.type,
            n.title,
            n.message,
            n.data,
            n.created_at,
            n.is_read,
            s.short_name AS series
          FROM notifications n
          JOIN series s ON n.series_id = s.id
          WHERE n.user_id = $1
          AND n.is_read = true
          AND n.created_at BETWEEN $2 AND $3
          ORDER BY n.created_at DESC
          LIMIT $4
          `,
          [userId, weekStart.toISOString(), weekEnd.toISOString(), remaining],
        );

        read = readResult.rows;
      }

      notifications = [...unread, ...read];
      hasMore = false;
    }

    // ============================================
    // 🔥 CASE 3: ALL READ → latest 20
    // ============================================
    else {
      const result = await db.query(
        `
        SELECT
          n.id,
          n.type,
          n.title,
          n.message,
          n.data,
          n.created_at,
          n.is_read,
          s.short_name AS series
        FROM notifications n
        JOIN series s ON n.series_id = s.id
        WHERE n.user_id = $1
        AND n.created_at BETWEEN $2 AND $3
        ${cursor ? "AND n.created_at < $4" : ""}
        ORDER BY n.created_at DESC
        LIMIT $${cursor ? 5 : 4}
        `,
        cursor
          ? [
              userId,
              weekStart.toISOString(),
              weekEnd.toISOString(),
              cursor,
              LIMIT,
            ]
          : [userId, weekStart.toISOString(), weekEnd.toISOString(), LIMIT],
      );

      notifications = result.rows;
      hasMore = result.rows.length === LIMIT;
    }

    return res.json({
      notifications,
      unread_count: unreadCount, // 🔥 IMPORTANT: real count
      has_more: hasMore,
      next_cursor:
        notifications.length > 0
          ? notifications[notifications.length - 1].created_at
          : null,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
