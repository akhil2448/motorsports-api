import { useState, useEffect, useRef } from "react";

import f1Logo from "../assets/logos/f1.svg";
import motogpLogo from "../assets/logos/motogp.svg";
import wrcLogo from "../assets/logos/wrc.svg";
import indycarLogo from "../assets/logos/indycar.svg";
import gtwcLogo from "../assets/logos/gtwc.svg";
import dtmLogo from "../assets/logos/dtm.svg";

const logoMap = {
  F1: f1Logo,
  MotoGP: motogpLogo,
  WRC: wrcLogo,
  IndyCar: indycarLogo,
  GTWC: gtwcLogo,
  DTM: dtmLogo,
};

export default function SeriesCard({ event, expanded, onToggle }) {
  const { series, eventName, location, startDate, endDate, sessions } = event;

  const logo = logoMap[series];

  // ✅ fallback state for Events page
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded = expanded !== undefined ? expanded : internalExpanded;

  const [now, setNow] = useState(new Date());

  const cardRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ AUTO SCROLL (same as calendar)
  useEffect(() => {
    if (isExpanded && cardRef.current) {
      const yOffset = -80;

      const y =
        cardRef.current.getBoundingClientRect().top +
        window.pageYOffset +
        yOffset;

      setTimeout(() => {
        window.scrollTo({
          top: y,
          behavior: "smooth",
        });
      }, 80);
    }
  }, [isExpanded]);

  const getCountdown = (target) => {
    const diff = target - now;
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `${days}d`;
    return `${hours}h ${mins}m`;
  };

  const isOngoing = now >= startDate && now <= endDate;

  const isAnySessionLive = sessions.some((s) => now >= s.start && now <= s.end);

  const formattedDate = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  let eventStatus = "";

  if (isAnySessionLive) {
    eventStatus = "LIVE";
  } else if (isOngoing) {
    eventStatus = "UPCOMING";
  } else {
    eventStatus = getCountdown(startDate);
  }

  return (
    <div
      ref={cardRef}
      className={`series-card ${isExpanded ? "expanded" : ""}`}
      onClick={() => {
        if (onToggle) {
          onToggle(series);
        } else {
          setInternalExpanded((prev) => !prev);
        }
      }}>
      {/* Accent */}
      <div className={`accent ${series.toLowerCase()}`} />

      <div className="series-header">
        <div className="logo-container">
          <img
            src={logo}
            alt={series}
            className={`series-logo ${series.toLowerCase()}`}
          />
        </div>

        <div className="date-container">
          <div className="event-date-big">{formattedDate}</div>

          <div
            className={`countdown ${
              eventStatus === "LIVE"
                ? "live"
                : eventStatus === "UPCOMING"
                  ? "upcoming"
                  : ""
            }`}>
            {eventStatus === "LIVE" ? (
              <span className="live-indicator">
                <span className="dot" />
                LIVE
              </span>
            ) : (
              eventStatus
            )}
          </div>
        </div>
      </div>

      <div className="event-name">{eventName}</div>
      <div className="event-location">{location}</div>

      {/* ✅ IMPORTANT: keep mounted for animation */}
      <div className="sessions-wrapper">
        <div className={`sessions ${isExpanded ? "open" : ""}`}>
          {sessions.map((s, idx) => {
            const isLive = now >= s.start && now <= s.end;
            const countdown = getCountdown(s.start);

            return (
              <div key={idx} className={`session ${isLive ? "live" : ""}`}>
                <span>{s.name}</span>

                <span className="session-time">
                  {isLive ? (
                    <span className="live-indicator">
                      <span className="dot" />
                      LIVE
                    </span>
                  ) : (
                    countdown || "Done"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
