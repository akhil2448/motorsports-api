self.addEventListener("push", function (event) {
  let data = {};

  try {
    data = event.data.json();
  } catch {
    data = {};
  }

  const notif = data.notification || data;

  self.registration.showNotification(notif.title || "Notification", {
    body: notif.body || "No message",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
});
