import { useState, useEffect, useRef } from "react";

import f1Logo from "../assets/logos/f1.svg";
import motogpLogo from "../assets/logos/motogp.svg";
import wrcLogo from "../assets/logos/wrc.svg";
import indycarLogo from "../assets/logos/indycar.svg";
import gtwcLogo from "../assets/logos/gtwc.svg";
import dtmLogo from "../assets/logos/dtm.svg";

const logoMap = {
  f1: f1Logo,
  motogp: motogpLogo,
  wrc: wrcLogo,
  indycar: indycarLogo,
  gtwc: gtwcLogo,
  dtm: dtmLogo,
};

export default function SeriesCard({ event, expanded, onToggle }) {
  const {
    series,
    event_name,
    location,
    start_date,
    end_date,
    event_start,
    event_end,
    sessions = [],
  } = event;

  const safeParseDate = (value) => {
    if (!value) return null;

    const d = new Date(value);

    // ✅ correct validation
    if (isNaN(d.getTime())) return null;

    return d;
  };

  const startDate = safeParseDate(event_start) || safeParseDate(start_date);
  const endDate = safeParseDate(event_end) || safeParseDate(end_date);

  //console.log("EVENT START RAW:", event_start);
  //console.log("PARSED START:", startDate);

  // ✅ Normalize sessions
  const normalizedSessions = sessions.map((s) => ({
    ...s,
    start: new Date(s.start_time || s.start),
    end: new Date(s.end_time || s.end),
  }));

  const logo = logoMap[series];

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

  useEffect(() => {
    if (isExpanded && cardRef.current) {
      const yOffset = -80;
      const y =
        cardRef.current.getBoundingClientRect().top +
        window.pageYOffset +
        yOffset;

      setTimeout(() => {
        window.scrollTo({ top: y, behavior: "smooth" });
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

  // ✅ FIXED STATUS LOGIC
  const isEventOngoing =
    startDate && endDate && now >= startDate && now <= endDate;

  const isAnySessionLive =
    normalizedSessions.length > 0 &&
    normalizedSessions.some((s) => now >= s.start && now <= s.end);

  const nextSession =
    normalizedSessions.length > 0
      ? normalizedSessions.find((s) => s.start > now)
      : null;

  let eventStatus = "";

  if (isAnySessionLive) {
    eventStatus = "LIVE";
  } else if (isEventOngoing) {
    eventStatus = "UPCOMING"; // ✅ priority fix
  } else if (nextSession) {
    eventStatus = getCountdown(nextSession.start);
  } else if (sessions.length > 0) {
    eventStatus = "DONE";
  } else {
    eventStatus = getCountdown(startDate);
  }

  // ✅ NEW DATE FORMAT (WITH WEEKDAYS)
  const formatDateRange = (start, end) => {
    const startDay = start.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const startDateStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const endDay = end.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const endDateStr = end.toLocaleDateString("en-US", {
      day: "numeric",
    });

    if (start.getMonth() === end.getMonth()) {
      return `${startDay}, ${startDateStr} - ${endDay}, ${endDateStr}`;
    }

    return `${startDay}, ${startDateStr} - ${endDay}, ${end.toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    )}`;
  };

  const formattedDate =
    startDate && endDate ? formatDateRange(startDate, endDate) : "Schedule TBD";

  return (
    <div
      ref={cardRef}
      className={`series-card ${isExpanded ? "expanded" : ""}`}
      onClick={() => {
        if (onToggle) onToggle();
        else setInternalExpanded((prev) => !prev);
      }}>
      {/* Accent */}
      <div className={`accent ${series}`} />

      <div className="series-header">
        <div className="logo-container">
          <img src={logo} alt={series} className={`series-logo ${series}`} />
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

      <div className="event-name">{event_name}</div>
      <div className="event-location">{location}</div>

      {/* SESSIONS */}
      <div className="sessions-wrapper">
        <div className={`sessions ${isExpanded ? "open" : ""}`}>
          {/* EMPTY STATE */}
          {sessions.length === 0 && (
            <div className="session">
              <span>Schedule yet to be released</span>
            </div>
          )}

          {normalizedSessions.map((s, idx) => {
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
