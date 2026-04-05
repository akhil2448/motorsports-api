const db = require("../db/pool");
const webpush = require("../src/config/webPush");

async function getUnsentNotifications() {
  const result = await db.query(
    `
    SELECT * FROM notifications
    WHERE is_sent = false
    ORDER BY created_at ASC
    LIMIT 50
    `,
  );

  return result.rows;
}

async function sendPushForNotification(notification) {
  // 1. Get subscriptions for this user
  const subsResult = await db.query(
    `
    SELECT * FROM push_subscriptions
    WHERE user_id = $1
    AND subscribed_at <= $2
    `,
    [notification.user_id, notification.created_at],
  );

  const subscriptions = subsResult.rows;

  if (subscriptions.length === 0) {
    console.log("No subscriptions for user:", notification.user_id);
    return;
  }

  // 2. Prepare payload
  const payload = JSON.stringify({
    notification: {
      title: notification.title || "Race Update",
      body: notification.message || "New update available",
    },
  });

  // 3. Send push to all subscriptions
  let success = false;

  for (const sub of subscriptions) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(subscription, payload);
      console.log("Push sent to user:", notification.user_id);
      success = true;
    } catch (err) {
      console.error("Push failed:", err.message);

      // 🔥 Remove invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log("Removing invalid subscription:", sub.endpoint);

        await db.query(
          `
      DELETE FROM push_subscriptions
      WHERE endpoint = $1
      `,
          [sub.endpoint],
        );
      }
    }
  }

  // ✅ Mark as sent ONLY if at least one push worked
  if (success) {
    await db.query(
      `
    UPDATE notifications
    SET is_sent = true
    WHERE id = $1
    `,
      [notification.id],
    );

    console.log("Notification marked as sent:", notification.id);
  }
}

module.exports = {
  getUnsentNotifications,
  sendPushForNotification,
};
