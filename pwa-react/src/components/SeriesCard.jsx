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

const normalizeSeries = (s) => {
  if (!s) return "";

  const value = s.toLowerCase();

  if (value.includes("f1")) return "f1";
  if (value.includes("motogp")) return "motogp";
  if (value.includes("wrc")) return "wrc";
  if (value.includes("indy")) return "indycar";
  if (value.includes("gtwc")) return "gtwc";
  if (value.includes("dtm")) return "dtm";

  return "";
};

export default function SeriesCard({ event, expanded, onToggle }) {
  const {
    series,
    event_name,
    location,
    event_start,
    event_end,
    sessions = [],
  } = event;

  // ✅ STRICT parser (no hacks)
  const parseUTCDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const startDate = parseUTCDate(event_start);
  const endDate = parseUTCDate(event_end);

  const normalizedSessions = sessions.map((s) => ({
    ...s,
    start: parseUTCDate(s.start_time || s.start),
    end: parseUTCDate(s.end_time || s.end),
  }));

  const logo = logoMap[normalizeSeries(series)];

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

  const getCountdown = (target) => {
    if (!target) return null;

    const diff = target - now;
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `${days}d`;
    return `${hours}h ${mins}m`;
  };

  const isEventOngoing =
    startDate && endDate && now >= startDate && now <= endDate;

  const isAnySessionLive =
    normalizedSessions.length > 0 &&
    normalizedSessions.some(
      (s) => s.start && s.end && now >= s.start && now <= s.end,
    );

  const nextSession =
    normalizedSessions.find((s) => s.start && s.start > now) || null;

  let eventStatus = "";

  if (isAnySessionLive) {
    eventStatus = "LIVE";
  } else if (isEventOngoing) {
    eventStatus = "LIVE";
  } else if (nextSession) {
    eventStatus = getCountdown(nextSession.start);
  } else if (normalizedSessions.length > 0) {
    eventStatus = "DONE";
  } else {
    eventStatus = getCountdown(startDate) || "TBD";
  }

  const formatDateRange = (start, end) => {
    if (!start || !end) return "TBD";

    const startDay = start.toLocaleDateString("en-US", { weekday: "long" });
    const startDateStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const endDay = end.toLocaleDateString("en-US", { weekday: "long" });
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

  const formattedDate = formatDateRange(startDate, endDate);

  return (
    <div
      ref={cardRef}
      className={`series-card ${isExpanded ? "expanded" : ""}`}
      onClick={() => {
        if (onToggle) onToggle();
        else setInternalExpanded((prev) => !prev);
      }}>
      <div className={`accent ${normalizeSeries(series)}`} />

      <div className="series-header">
        <div className="logo-container">
          <img src={logo} alt={series} className="series-logo" />
        </div>

        <div className="date-container">
          <div className="event-date-big">{formattedDate}</div>

          <div className={`countdown ${eventStatus === "LIVE" ? "live" : ""}`}>
            {eventStatus}
          </div>
        </div>
      </div>

      <div className="event-name">{event_name}</div>
      <div className="event-location">{location}</div>
    </div>
  );
}
