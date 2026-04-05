const express = require("express");
const router = express.Router();

const {
  getUnsentNotifications,
  sendPushForNotification,
} = require("../services/pushService");

router.post("/run", async (req, res) => {
  try {
    const notifications = await getUnsentNotifications();

    console.log("Processing notifications:", notifications.length);

    for (const notification of notifications) {
      await sendPushForNotification(notification);
    }

    res.json({ success: true, processed: notifications.length });
  } catch (err) {
    console.error("Push cron error:", err);
    res.status(500).json({ error: "Cron failed" });
  }
});

module.exports = router;
