import { useEffect, useRef, useState } from "react";
import { getTimeAgo } from "../utils/time";

import f1Logo from "../assets/logos/f1.svg";
import motogpLogo from "../assets/logos/motogp.svg";
import wrcLogo from "../assets/logos/wrc.svg";
import indycarLogo from "../assets/logos/indycar.svg";
import gtwcLogo from "../assets/logos/gtwc.svg";
import dtmLogo from "../assets/logos/dtm.svg";

const logoMap = {
  F1: f1Logo,
  WRC: wrcLogo,
  MOTOGP: motogpLogo,
  INDYCAR: indycarLogo,
  GTWC: gtwcLogo,
  DTM: dtmLogo,
};

const normalizeSeries = (series) => {
  if (!series) return null;

  const s = series.trim().toUpperCase();

  if (s === "F1") return "F1";
  if (s === "WRC") return "WRC";
  if (s === "MOTOGP") return "MotoGP";
  if (s === "INDYCAR") return "IndyCar";
  if (s === "DTM") return "DTM";

  if (s.includes("GTWC")) return "GTWC";

  return null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function NotificationItem({
  n,
  setNotifications,
  setUnreadCount,
}) {
  const ref = useRef(null);
  const isSeen = n.is_read;

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
          item.id === n.id ? { ...item, is_read: true } : item,
        ),
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));

      // 🔥 persist to backend
      fetch(`${API_BASE}/notifications/${n.id}/read`, {
        method: "PATCH",
        headers: {
          "x-user-id": localStorage.getItem("user_id"),
        },
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [isVisible, isSeen, n.id, setNotifications, setUnreadCount]);

  return (
    <div
      ref={ref}
      className={`notification-item ${isSeen ? "read" : "unread"}`}>
      {/* ✅ ACCENT BAR */}
      {(() => {
        const normalized = normalizeSeries(n.series);
        return (
          normalized && <div className={`accent ${normalized.toLowerCase()}`} />
        );
      })()}
      <div className="notification-header">
        {(() => {
          const normalized = normalizeSeries(n.series);
          const logo = logoMap[normalized];

          return (
            logo && (
              <img
                src={logo}
                alt={normalized}
                className={`notification-series-logo ${normalized.toLowerCase()}`}
              />
            )
          );
        })()}
        <span className="time">{getTimeAgo(n.created_at)}</span>
      </div>

      <div className="notification-title">{n.title}</div>
      {(() => {
        if (!n.message) return null;

        const parts = n.message.split("|");

        if (parts.length < 3) {
          return <div className="notification-message">{n.message}</div>;
        }

        const [, event, detail] = parts;

        return (
          <div className="notification-message">
            <div className="message-event">{event}</div>
            <div className="message-detail">{detail}</div>
          </div>
        );
      })()}
    </div>
  );
}
