import NotificationItem from "../components/NotificationItem";
import "../styles/components/notifications.css";

function groupNotifications(notifications) {
  const groups = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  const now = new Date();

  notifications.forEach((n) => {
    const date = new Date(n.created_at);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const diffDays = Math.floor((today - itemDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) groups.today.push(n);
    else if (diffDays === 1) groups.yesterday.push(n);
    else groups.earlier.push(n);
  });

  return groups;
}

export default function Notifications({ notifications, setNotifications }) {
  // ✅ sort newest first + limit to 20
  const sorted = [...notifications]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  const grouped = groupNotifications(sorted);

  return (
    <div className="notifications-container">
      <div className="notifications-list">
        {/* TODAY */}
        {grouped.today.length > 0 && (
          <>
            <div className="section-title">Today</div>
            {grouped.today.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                setNotifications={setNotifications}
              />
            ))}
          </>
        )}

        {/* YESTERDAY */}
        {grouped.yesterday.length > 0 && (
          <>
            <div className="section-title">Yesterday</div>
            {grouped.yesterday.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                setNotifications={setNotifications}
              />
            ))}
          </>
        )}

        {/* EARLIER */}
        {grouped.earlier.length > 0 && (
          <>
            <div className="section-title">Earlier</div>
            {grouped.earlier.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                setNotifications={setNotifications}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
