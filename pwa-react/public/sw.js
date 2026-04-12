self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data.json();
  } catch {
    data = {};
  }

  const notif = data.notification || data;

  event.waitUntil(
    self.registration.showNotification(notif.title || "Notification", {
      body: notif.body || "No message",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: notif.data || {},
    }),
  );
});
