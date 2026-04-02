import { useEffect, useRef, useState } from "react";
import { getTimeAgo } from "../utils/time";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
// const API_BASE = "http://localhost:3000";

export default function NotificationItem({
  n,
  setNotifications,
  setUnreadCount,
}) {
  const ref = useRef(null);
  const isSeen = n.isRead;

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isSeen) return;

    const timer = setTimeout(() => {
      // ✅ update global state ONCE
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, isRead: true } : item,
        ),
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));

      // 🔥 persist to backend
      fetch(`${API_BASE}/notifications/${n.id}/read`, {
        method: "PATCH",
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [isVisible, isSeen, n.id, setNotifications, setUnreadCount]);

  return (
    <div
      ref={ref}
      className={`notification-item ${isSeen ? "read" : "unread"}`}>
      <div className="notification-header">
        <span className="series">{n.series}</span>
        <span className="time">{getTimeAgo(n.created_at)}</span>
      </div>

      <div className="notification-title">{n.title}</div>
      <div className="notification-message">{n.message}</div>
    </div>
  );
}
