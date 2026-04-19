const express = require("express");
const router = express.Router();
const db = require("../db/pool");

const {
  getUnsentNotifications,
  sendPushForNotification,
} = require("../services/pushService");

router.post("/run", async (req, res) => {
  // ✅ ADD THIS BLOCK HERE (top of handler)
  const SECRET = process.env.CRON_SECRET;

  if (req.headers["x-cron-secret"] !== SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const notifications = await client.query(`
    SELECT * FROM notifications
    WHERE is_sent = false
    ORDER BY created_at ASC
    LIMIT 20
    FOR UPDATE SKIP LOCKED
  `);

      const rows = notifications.rows;

      console.log("Processing notifications:", rows.length);

      for (const notification of rows) {
        try {
          if (!notification.user_id) {
            console.log("Skipping invalid notification:", notification.id);

            await client.query(
              `UPDATE notifications SET is_sent = true WHERE id = $1`,
              [notification.id],
            );
            continue;
          }

          await sendPushForNotification(notification);
        } catch (err) {
          console.error("Push processing error:", err);
        }
      }

      await client.query("COMMIT");

      res.json({ success: true, processed: rows.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Push cron error:", err);
    res.status(500).json({ error: "Cron failed" });
  }
});

module.exports = router;
