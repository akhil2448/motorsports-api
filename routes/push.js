const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const webpush = require("../src/config/webPush");

/**
 * POST /push/subscribe
 * Save push subscription for a user
 */
router.post("/subscribe", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(400).json({
        error: "Missing x-user-id header",
      });
    }

    await db.query(
      `
  INSERT INTO users (id)
  VALUES ($1)
  ON CONFLICT (id) DO NOTHING
  `,
      [userId],
    );

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        error: "Invalid subscription payload",
      });
    }

    await db.query(
      `
      INSERT INTO push_subscriptions (
        user_id,
        endpoint,
        p256dh,
        auth
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint)
      DO UPDATE SET
      user_id = EXCLUDED.user_id,   
      subscribed_at = now()
      `,
      [userId, endpoint, keys.p256dh, keys.auth],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err.message);
    return res.status(500).json({
      error: "Failed to save subscription",
    });
  }
});

// TEST PUSH
router.post("/test", async (req, res) => {
  try {
    // get one subscription (for now)
    const result = await db.query("SELECT * FROM push_subscriptions LIMIT 1");

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No subscriptions found" });
    }

    const row = result.rows[0];

    const subscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    const payload = JSON.stringify({
      notification: {
        title: "Test Notification",
        body: "Your push system is working 🚀",
      },
    });

    try {
      await webpush.sendNotification(subscription, payload);
    } catch (err) {
      console.error("WebPush error:", err);
      throw err;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Push error:", err);
    res.status(500).json({ error: "Push failed" });
  }
});

/**
 * GET /push/status
 * Check if user has active push subscription
 */
router.get("/status", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(400).json({
        error: "Missing x-user-id header",
      });
    }

    const result = await db.query(
      `
      SELECT 1
      FROM push_subscriptions
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId],
    );

    return res.json({
      subscribed: result.rows.length > 0,
    });
  } catch (err) {
    console.error("Push status error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch push status",
    });
  }
});

module.exports = router;
