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
        id,
        type,
        title,
        message,
        data,
        created_at
      FROM notifications
      WHERE created_at > $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [sinceDate.toISOString()],
    );

    return res.json({
      notifications: result.rows,
      has_more: result.rows.length === 100,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Fetch notifications error:", err.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
