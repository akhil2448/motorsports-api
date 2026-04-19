const db = require("../db/pool");
const webpush = require("../src/config/webPush");

async function getUnsentNotifications(client) {
  const result = await client.query(
    `
    SELECT * FROM notifications
    WHERE is_sent = false
    ORDER BY created_at ASC
    LIMIT 20
    FOR UPDATE SKIP LOCKED
    `,
  );

  return result.rows;
}

function formatTime(min) {
  if (min <= 1) return "now";
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h`;
}

function buildNotificationPayload(notification) {
  const data =
    typeof notification.data === "string"
      ? JSON.parse(notification.data)
      : notification.data;

  if (!data || !data.start_time) return null;

  const now = new Date();
  const start = new Date(data.start_time);

  const diffMin = Math.round((start - now) / 60000);

  // 🚫 Skip outdated BEFORE notifications
  if (notification.type === "BEFORE" && diffMin <= 0) {
    return null;
  }

  // 🔥 LIVE (session started)
  if (diffMin <= 1) {
    return {
      title: data.series,
      body: `|${data.event_name}|${data.name} is live`,
    };
  }

  // ⏳ BEFORE
  return {
    title: data.series,
    body: `|${data.event_name}|${data.name} in ${formatTime(diffMin)}`,
  };
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
    await db.query(`UPDATE notifications SET is_sent = true WHERE id = $1`, [
      notification.id,
    ]);
    return;
  }

  const built = buildNotificationPayload(notification);

  if (!built) {
    // skip outdated notification
    await db.query(`UPDATE notifications SET is_sent = true WHERE id = $1`, [
      notification.id,
    ]);
    return;
  }

  const payload = JSON.stringify({
    notification: {
      title: built.title,
      body: built.body,
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
