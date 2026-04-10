const express = require("express");
const router = express.Router();

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
    const notifications = await getUnsentNotifications();

    console.log("Processing notifications:", notifications.length);

    for (const notification of notifications) {
      if (!notification.user_id) {
        console.log("Skipping invalid notification:", notification.id);

        await db.query(
          `UPDATE notifications SET is_sent = true WHERE id = $1`,
          [notification.id],
        );

        continue;
      }

      await sendPushForNotification(notification);
    }

    res.json({ success: true, processed: notifications.length });
  } catch (err) {
    console.error("Push cron error:", err);
    res.status(500).json({ error: "Cron failed" });
  }
});

module.exports = router;
