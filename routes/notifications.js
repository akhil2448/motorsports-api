const express = require("express");
const router = express.Router();
const db = require("../db/pool");

/**
 * GET /notifications?since=timestamp
 */
router.get("/", async (req, res) => {
  try {
    const { since } = req.query;
    const userId = req.headers["x-user-id"];

    // 🛑 Validate input
    if (!since || !userId) {
      return res.status(400).json({
        error: "Missing 'since' or 'x-user-id'",
      });
    }

    const sinceDate = new Date(since);

    if (isNaN(sinceDate)) {
      return res.status(400).json({
        error: "Invalid 'since' timestamp",
      });
    }

    // 🧠 Get current week (Monday → Sunday)
    const now = new Date();

    // get day (0 = Sunday, 1 = Monday ...)
    const day = now.getDay();

    // convert to Monday-based index
    const diffToMonday = day === 0 ? -6 : 1 - day;

    // Monday start
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Sunday end
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // 📦 Fetch notifications (USER SCOPED)
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
  ORDER BY n.created_at DESC
  `,
      [userId, weekStart.toISOString(), weekEnd.toISOString()],
    );

    // 🔥 unread count (USER SCOPED)
    const unreadRes = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1
      AND is_read = false
      `,
      [userId],
    );

    const unreadCount = parseInt(unreadRes.rows[0].count, 10);

    return res.json({
      notifications: result.rows,
      unread_count: unreadCount,
      has_more: false,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * PATCH /notifications/:id/read
 */
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(400).json({
        error: "Missing 'x-user-id'",
      });
    }

    const result = await db.query(
      `
  UPDATE notifications
  SET is_read = true
  WHERE id = $1
  AND user_id = $2
  RETURNING id, is_read
  `,
      [id, userId],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
