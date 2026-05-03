import { useState, useRef, useEffect } from "react";

import f1Logo from "../assets/logos/f1.svg";
import motogpLogo from "../assets/logos/motogp.svg";
import wrcLogo from "../assets/logos/wrc.svg";
import indycarLogo from "../assets/logos/indycar.svg";
import gtwcLogo from "../assets/logos/gtwc.svg";
import dtmLogo from "../assets/logos/dtm.svg";
import ttLogo from "../assets/logos/tt.svg";

const normalizeSeries = (series) => {
  if (!series) return null;

  const s = series.trim().toUpperCase();

  if (s === "F1") return "F1";
  if (s === "WRC") return "WRC";
  if (s === "MOTOGP") return "MotoGP";
  if (s === "INDYCAR") return "IndyCar";
  if (s === "DTM") return "DTM";
  if (s === "TT") return "TT";
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
  TT: ttLogo,
};

const formatDateRange = (start, end) => {
  const options = { weekday: "short", day: "numeric", month: "short" };

  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
};

const groupByDay = (sessions, useLocalTime) => {
  const grouped = {};

  sessions.forEach((s) => {
    let key;

    if (useLocalTime) {
      key = new Date(s.start_time_local).toDateString();
    } else {
      key = new Date(s.start_time_utc).toDateString();
    }

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  return grouped;
};

const groupTTByPhaseAndDay = (sessions, useLocalTime) => {
  const phaseGroups = {};

  sessions.forEach((s) => {
    const phase = s.phase || "other";

    const dateKey = useLocalTime
      ? new Date(s.start_time_local).toDateString()
      : new Date(s.start_time_utc).toDateString();

    if (!phaseGroups[phase]) {
      phaseGroups[phase] = {};
    }

    if (!phaseGroups[phase][dateKey]) {
      phaseGroups[phase][dateKey] = [];
    }

    phaseGroups[phase][dateKey].push(s);
  });

  return Object.entries(phaseGroups).map(([phase, days]) => ({
    phase,
    days: Object.entries(days).map(([date, sessions]) => ({
      date,
      sessions,
    })),
  }));
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

  const sortedEvents = [...data.events].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate),
  );

  const currentEvent =
    sortedEvents.find((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return now >= start && now <= end;
    }) || null;

  const nextEvent =
    sortedEvents.find((e) => new Date(e.startDate) > now) || null;

  const formatCountdown = (target) => {
    const diff = target - now;

    if (diff <= 0) return "Now";

    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    // > 2 days → only days
    if (totalDays >= 2) {
      return `${totalDays}d`;
    }

    // < 2 days → d + h
    if (totalDays >= 1) {
      const hours = totalHours % 24;
      return `${totalDays}d ${hours}h`;
    }

    // < 1 day → HH:MM
    if (totalHours >= 1) {
      const hours = totalHours;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    // < 1 hour → MM:SS
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const formatTrackTime = (str) => {
    if (!str) return "";

    const d = new Date(str);

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
            {data.events.filter((e) => new Date(e.endDate) >= now).length}{" "}
            Upcoming
          </div>
        </div>
      </div>

      {currentEvent ? (
        <div className="session-calendar-preview">
          <span className="session-calendar-preview-name">
            Now: {currentEvent.name}
          </span>
          <span className="session-calendar-preview-time">Ongoing</span>
        </div>
      ) : nextEvent ? (
        <div className="session-calendar-preview">
          <span className="session-calendar-preview-name">
            Next: {nextEvent.name}
          </span>
          <span className="session-calendar-preview-time">
            {formatCountdown(new Date(nextEvent.startDate))}
          </span>
        </div>
      ) : null}

      {/* EVENTS */}
      <div className="calendar-events">
        {expanded &&
          data.events.map((event, idx) => {
            //const start = new Date(event.startDate);
            const end = new Date(event.endDate);

            const isCompleted = now > end;

            const isNext =
              nextEvent &&
              new Date(event.startDate).getTime() ===
                new Date(nextEvent.startDate).getTime();

            return (
              <div
                key={idx}
                className={`calendar-event ${
                  activeEvent === idx ? "active" : ""
                } ${isCompleted ? "completed" : ""}`}>
                <div
                  className="calendar-event-header"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEvent(activeEvent === idx ? null : idx);
                  }}>
                  <div className="event-header-left">
                    <div className={`event-title ${isNext ? "highlight" : ""}`}>
                      {event.name}
                    </div>

                    {event.location && (
                      <div className="event-location">
                        {event.location}
                        {event.country ? `, ${event.country}` : ""}
                      </div>
                    )}
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
                    (!event.sessions || event.sessions.length === 0) && (
                      <div className="session">
                        <span>Schedule yet to be released</span>
                      </div>
                    )}

                  {activeEvent === idx &&
                    Object.entries(
                      data.series === "TT"
                        ? (() => {
                            const merged = {};

                            groupTTByPhaseAndDay(
                              event.sessions,
                              useLocalTime,
                            ).forEach((phaseGroup) => {
                              phaseGroup.days.forEach((d) => {
                                if (!merged[d.date]) {
                                  merged[d.date] = [];
                                }

                                merged[d.date].push(
                                  ...d.sessions.map((s) => ({
                                    ...s,
                                    phase: s.phase || phaseGroup.phase,
                                  })),
                                );
                              });
                            });

                            return merged;
                          })()
                        : groupByDay(event.sessions, useLocalTime),
                    ).map(([day, sessions], i) => {
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
                            {useLocalTime
                              ? new Date(day).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })
                              : new Date(day).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                          </div>

                          {[...sessions]
                            .sort(
                              (a, b) =>
                                new Date(a.start_time_utc) -
                                new Date(b.start_time_utc),
                            )
                            .map((s, j) => {
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
                                  <span>
                                    {data.series === "TT" && s.phase && (
                                      <span
                                        className={`phase-badge ${s.phase}`}>
                                        {s.phase === "race" ? "RACE" : "QUALI"}
                                      </span>
                                    )}
                                    {s.name}
                                  </span>

                                  <div className="session-right">
                                    {isLive ? (
                                      <div className="live-indicator">
                                        <span className="dot" />
                                        LIVE
                                      </div>
                                    ) : (
                                      <span>
                                        {(() => {
                                          const formatLocal = (d) =>
                                            d.toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              hour12: false,
                                            });

                                          let displayStart;
                                          let displayEnd;

                                          if (useLocalTime) {
                                            displayStart = formatTrackTime(
                                              s.start_time_local,
                                            );
                                            displayEnd = s.end_time_local
                                              ? formatTrackTime(
                                                  s.end_time_local,
                                                )
                                              : null;
                                          } else {
                                            displayStart = formatLocal(start);
                                            displayEnd = end
                                              ? formatLocal(end)
                                              : null;
                                          }

                                          return `${displayStart}${displayEnd ? ` - ${displayEnd}` : ""}`;
                                        })()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
