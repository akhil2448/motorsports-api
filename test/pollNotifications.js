const fetch = require("node-fetch");

let lastSeen = "1970-01-01T00:00:00Z";

async function poll() {
  try {
    const res = await fetch(
      `http://localhost:3000/notifications?since=${lastSeen}`,
    );

    const data = await res.json();

    if (data.notifications.length > 0) {
      console.log("\n🔔 New Notifications:");

      for (const n of data.notifications) {
        console.log(`- ${n.title}: ${n.message}`);
      }
    }

    // ✅ update last seen using server time
    lastSeen = data.server_time;
  } catch (err) {
    console.error("Polling error:", err.message);
  }
}

// ⏱️ poll every 10 seconds (for testing)
setInterval(poll, 10000);

console.log("🚀 Polling started...");
