import { useState, useRef, useEffect } from "react";

import f1Logo from "../assets/logos/f1.svg";
import motogpLogo from "../assets/logos/motogp.svg";
import wrcLogo from "../assets/logos/wrc.svg";
import indycarLogo from "../assets/logos/indycar.svg";
import gtwcLogo from "../assets/logos/gtwc.svg";
import dtmLogo from "../assets/logos/dtm.svg";

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

  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
};

const groupByDay = (sessions) => {
  const grouped = {};

  sessions.forEach((s) => {
    const date = new Date(s.start_time_utc);
    const key = date.toDateString();

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

  const cardRef = useRef(null);

  useEffect(() => {
    if (expanded && cardRef.current) {
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
  }, [expanded]);

  const getCountdown = (target) => {
    const diff = target - now;
    if (diff <= 0) return "Now";

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / (1000 * 60)) % 60);

    return `${h}h ${m}m`;
  };

  return (
    <div
      ref={cardRef}
      className={`series-card ${expanded ? "expanded" : ""}`}
      onClick={onClick}>
      <div className={`accent ${data.series.toLowerCase()}`} />

      {/* HEADER */}
      <div className="series-header">
        <div className="logo-container">
          {(() => {
            const normalized = normalizeSeries(data.series);

            return (
              normalized && (
                <img
                  src={logoMap[normalized]}
                  className={`series-logo ${normalized.toLowerCase()}`}
                />
              )
            );
          })()}
        </div>

        <div className="date-container">
          <div className="event-date-big">
            {
              data.events.filter((e) => new Date(e.startDate) >= new Date())
                .length
            }{" "}
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
                    ([day, sessions], i) => {
                      const isToday =
                        new Date(day).toDateString() === now.toDateString();

                      return (
                        <div
                          key={i}
                          className={`session-day-group ${
                            isToday ? "today" : ""
                          }`}>
                          <div
                            className={`session-day ${isToday ? "today" : ""}`}>
                            {new Date(day).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>

                          {sessions.map((s, j) => {
                            const start = new Date(s.start_time_utc);
                            const end = s.end_time_utc
                              ? new Date(s.end_time_utc)
                              : null;

                            let isLive = false;

                            if (end) {
                              isLive = now >= start && now <= end;
                            } else {
                              const diff = now - start;
                              isLive = diff >= 0 && diff <= 10 * 60 * 1000;
                            }

                            const isCompleted = end ? now > end : now > start;

                            return (
                              <div
                                key={j}
                                className={`session ${
                                  isLive ? "live" : ""
                                } ${isCompleted ? "completed" : ""}`}>
                                <span>{s.name}</span>

                                <span>
                                  {isLive ? (
                                    <span className="live-indicator">
                                      <span className="dot" />
                                      LIVE
                                    </span>
                                  ) : useLocalTime ? (
                                    (() => {
                                      const format = (d) =>
                                        d.toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false,
                                        });

                                      return `${format(start)} - ${
                                        end ? format(end) : ""
                                      }`;
                                    })()
                                  ) : (
                                    getCountdown(start)
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    },
                  )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
