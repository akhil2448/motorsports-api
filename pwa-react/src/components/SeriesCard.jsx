import { useState, useEffect } from "react";

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

export default function SeriesCard({ event }) {
  const { series, eventName, location, startDate, endDate, sessions } = event;

  const logo = logoMap[series];
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

  // 🔥 UPDATED STATUS LOGIC
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
      className={`series-card ${expanded ? "expanded" : ""}`}
      onClick={() => setExpanded(!expanded)}>
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

          {/* 🔥 UPDATED COUNTDOWN BLOCK */}
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

      {expanded && (
        <div className="sessions">
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
      )}
    </div>
  );
}
