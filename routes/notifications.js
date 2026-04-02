const express = require("express");
const router = express.Router();
const db = require("../db/pool");

/**
 * GET /notifications?since=timestamp
 */
router.get("/", async (req, res) => {
  try {
    const { since } = req.query;

    // 🛑 Validate input
    if (!since) {
      return res.status(400).json({
        error: "Missing 'since' query param",
      });
    }

    const sinceDate = new Date(since);

    if (isNaN(sinceDate)) {
      return res.status(400).json({
        error: "Invalid 'since' timestamp",
      });
    }

    // 📦 Fetch notifications
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
      WHERE n.created_at > $1
      ORDER BY n.created_at DESC
      LIMIT 20
      `,
      [sinceDate.toISOString()],
    );

    // 🔥 fetch unread count
    const unreadRes = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE is_read = false
      `,
    );

    const unreadCount = parseInt(unreadRes.rows[0].count, 10);

    return res.json({
      notifications: result.rows,
      unread_count: unreadCount,
      has_more: result.rows.length === 20,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Fetch notifications error:", err.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
      `,
      [id],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
