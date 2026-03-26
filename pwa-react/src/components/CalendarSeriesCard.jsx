import { useState } from "react";

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

const formatDateRange = (start, end) => {
  const options = { weekday: "short", day: "numeric", month: "short" };

  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
};

const groupByDay = (sessions) => {
  const grouped = {};

  sessions.forEach((s) => {
    const key = s.start_time_utc.toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  return grouped;
};

export default function CalendarSeriesCard({
  data,
  expanded,
  onClick,
  useLocalTime,
}) {
  const [activeEvent, setActiveEvent] = useState(null);
  const now = new Date();

  const getCountdown = (target) => {
    const diff = target - now;
    if (diff <= 0) return "Now";

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / (1000 * 60)) % 60);

    return `${h}h ${m}m`;
  };

  return (
    <div
      className={`series-card ${expanded ? "expanded" : ""}`}
      onClick={onClick}>
      <div className={`accent ${data.series.toLowerCase()}`} />

      {/* HEADER */}
      <div className="series-header">
        <div className="logo-container">
          <img
            src={logoMap[data.series]}
            className={`series-logo ${data.series.toLowerCase()}`}
          />
        </div>

        <div className="date-container">
          <div className="event-date-big">
            {data.events.filter((e) => e.startDate >= new Date()).length}{" "}
            Upcoming
          </div>
        </div>
      </div>

      {/* EVENTS */}
      <div className="calendar-events">
        {expanded &&
          data.events.map((event, idx) => (
            <div
              key={idx}
              className={`calendar-event ${
                activeEvent === idx ? "active" : ""
              }`}>
              {/* EVENT HEADER */}
              <div
                className="calendar-event-header"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEvent(activeEvent === idx ? null : idx);
                }}>
                <div className="event-header-left">
                  <div className="event-title">{event.name}</div>
                  <div className="event-range">
                    {formatDateRange(event.startDate, event.endDate)}
                  </div>
                </div>

                <span
                  className={`chevron ${activeEvent === idx ? "open" : ""}`}>
                  ›
                </span>
              </div>

              {/* SESSIONS */}
              <div className="calendar-sessions">
                {activeEvent === idx &&
                  Object.entries(groupByDay(event.sessions)).map(
                    ([day, sessions], i) => (
                      <div key={i} className="session-day-group">
                        <div className="session-day">
                          {new Date(day).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>

                        {sessions.map((s, j) => {
                          const isLive =
                            now >= s.start_time_utc && now <= s.end_time_utc;

                          return (
                            <div
                              key={j}
                              className={`session ${isLive ? "live" : ""}`}>
                              <span>{s.name}</span>

                              <span>
                                {isLive ? (
                                  <span className="live-indicator">
                                    <span className="dot" />
                                    LIVE
                                  </span>
                                ) : useLocalTime ? (
                                  s.start_time_local
                                ) : (
                                  getCountdown(s.start_time_utc)
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ),
                  )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
