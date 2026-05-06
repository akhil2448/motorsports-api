import { useState, useEffect, useRef } from "react";

import f1Logo from "../assets/logos/f1.svg";
import motogpLogo from "../assets/logos/motogp.svg";
import wrcLogo from "../assets/logos/wrc.svg";
import indycarLogo from "../assets/logos/indycar.svg";
import gtwcLogo from "../assets/logos/gtwc.svg";
import dtmLogo from "../assets/logos/dtm.svg";
import ttLogo from "../assets/logos/tt.svg";

const logoMap = {
  f1: f1Logo,
  motogp: motogpLogo,
  wrc: wrcLogo,
  indycar: indycarLogo,
  gtwc: gtwcLogo,
  dtm: dtmLogo,
  tt: ttLogo,
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
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const startDate = safeParseDate(event_start) || safeParseDate(start_date);
  const endDate = safeParseDate(event_end) || safeParseDate(end_date);

  const normalizedSessions = sessions.map((s) => {
    const start = s.start ? new Date(s.start) : new Date(s.start_time);
    const end = s.end
      ? new Date(s.end)
      : s.end_time
        ? new Date(s.end_time)
        : null;

    return {
      ...s,
      start,
      end,
      status: s.status ?? "upcoming",
    };
  });

  const logo = logoMap[series];

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded !== undefined ? expanded : internalExpanded;

  const [now, setNow] = useState(new Date());
  const cardRef = useRef(null);

  // realtime countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
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

  const formatCountdownDetailed = (target) => {
    const diff = target - now;
    if (diff <= 0) return null;

    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h`;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
      2,
      "0",
    )}:${String(secs).padStart(2, "0")}`;
  };

  const formatLiveWindow = (start, end) => {
    const startedAgo = Math.floor((now - start) / 60000);
    const endsIn = Math.floor((end - now) / 60000);

    const h = Math.floor(endsIn / 60);
    const m = endsIn % 60;

    return `Started ${startedAgo}m ago • Ends in ${h > 0 ? `${h}h ` : ""}${m}m`;
  };

  const sortedSessions = [...normalizedSessions].sort(
    (a, b) => a.start - b.start,
  );

  const currentSession = sortedSessions.find((s) => s.status === "live");

  const nextSession =
    sortedSessions.find((s) => s.status === "upcoming") ||
    sortedSessions.find((s) => s.start > now);

  const highlightSession = currentSession || nextSession || null;

  // ✅ USE BACKEND STATUS (source of truth)
  let eventStatus = event.status;

  if (!eventStatus) {
    // 🔥 FIX: if event is in future → ALWAYS upcoming
    if (startDate && startDate > now) {
      eventStatus = "upcoming";
    }
    // 🔥 if event is ongoing (no sessions yet but within range)
    else if (startDate && endDate && now >= startDate && now <= endDate) {
      eventStatus = "ongoing";
    }
    // 🔥 if past
    else if (endDate && now > endDate) {
      eventStatus = "completed";
    }
    // 🔥 fallback
    else if (!sessions || sessions.length === 0) {
      eventStatus = "TBA";
    }
  }

  const formatDateRange = (start, end) => {
    const month = start.toLocaleDateString("en-US", {
      month: "short",
    });

    const startDay = start.toLocaleDateString("en-US", {
      weekday: "short",
    });

    const endDay = end.toLocaleDateString("en-US", {
      weekday: "short",
    });

    const startDateNum = start.getDate();
    const endDateNum = end.getDate();

    if (start.getMonth() === end.getMonth()) {
      return `${month} • ${startDay} ${startDateNum} – ${endDay} ${endDateNum}`;
    }

    const endMonth = end.toLocaleDateString("en-US", {
      month: "short",
    });

    return `${month} ${startDay} ${startDateNum} – ${endMonth} ${endDay} ${endDateNum}`;
  };

  const formattedDate =
    startDate && endDate ? formatDateRange(startDate, endDate) : "Schedule TBD";

  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const groupSessionsByDay = (sessions) => {
    const groups = {};

    sessions.forEach((s) => {
      const date = new Date(s.start);

      const key = date.toDateString(); // grouping key

      if (!groups[key]) {
        groups[key] = {
          date,
          sessions: [],
        };
      }

      groups[key].sessions.push(s);
    });

    return Object.values(groups).sort((a, b) => a.date - b.date);
  };

  const groupTTSessions = (sessions) => {
    const phaseGroups = {};

    sessions.forEach((s) => {
      const phase = (s.phase || "other").toUpperCase();
      const date = new Date(s.start);
      const dayKey = date.toDateString();

      if (!phaseGroups[phase]) {
        phaseGroups[phase] = {};
      }

      if (!phaseGroups[phase][dayKey]) {
        phaseGroups[phase][dayKey] = {
          date,
          sessions: [],
        };
      }

      phaseGroups[phase][dayKey].sessions.push(s);
    });

    return Object.entries(phaseGroups).map(([phase, days]) => ({
      phase,
      days: Object.values(days).sort((a, b) => a.date - b.date),
    }));
  };

  const groupedSessions =
    series === "tt"
      ? groupTTSessions(
          [...normalizedSessions].sort((a, b) => a.start - b.start),
        )
      : groupSessionsByDay(
          [...normalizedSessions].sort((a, b) => a.start - b.start),
        );

  return (
    <div
      ref={cardRef}
      className={`series-card ${isExpanded ? "expanded" : ""}`}
      onClick={() => {
        if (onToggle) onToggle();
        else setInternalExpanded((prev) => !prev);
      }}>
      <div className={`accent ${series}`} />

      <div className="series-header">
        <div className="logo-container">
          <img src={logo} alt={series} className={`series-logo ${series}`} />
        </div>

        <div className="date-container">
          <div className="event-date-big">{formattedDate}</div>

          <div
            className={`countdown ${
              eventStatus === "live"
                ? "live"
                : eventStatus === "ongoing"
                  ? "ongoing"
                  : eventStatus === "upcoming"
                    ? "upcoming"
                    : ""
            }`}>
            {eventStatus === "live" ? (
              <span className="live-indicator">
                <span className="dot" />
                LIVE
              </span>
            ) : eventStatus === "ongoing" ? (
              "ONGOING"
            ) : eventStatus === "upcoming" ? (
              getCountdown(startDate)
            ) : eventStatus === "TBA" ? (
              getCountdown(startDate) || "Schedule TBD"
            ) : eventStatus === "completed" ? (
              "Done"
            ) : (
              getCountdown(startDate)
            )}
          </div>
        </div>
      </div>

      <div className="event-name">{event_name}</div>
      <div className="event-location">{location}</div>

      {/* Preview row */}
      {highlightSession && highlightSession.start && (
        <div className="session-preview">
          <span className="session-preview-name">
            {currentSession ? (
              <>
                <span className="live-indicator">
                  <span className="dot" />
                  LIVE
                </span>
                {" • "}
              </>
            ) : eventStatus === "ongoing" ? (
              "Next: "
            ) : (
              "Next: "
            )}
            {series === "tt"
              ? `${(highlightSession.phase || "").toUpperCase()}: ${highlightSession.name}`
              : highlightSession.name}
          </span>

          <span className="session-preview-time">
            {currentSession
              ? formatLiveWindow(highlightSession.start, highlightSession.end)
              : formatCountdownDetailed(highlightSession.start)}
          </span>
        </div>
      )}

      <div className="sessions-wrapper">
        <div className={`sessions ${isExpanded ? "open" : ""}`}>
          {sessions.length === 0 && (
            <div className="session">
              <span>Schedule yet to be released</span>
            </div>
          )}

          {series === "tt"
            ? groupedSessions.map((phaseGroup) => (
                <div key={phaseGroup.phase} className="phase-group">
                  <div
                    className={`phase-title ${
                      phaseGroup.phase === "RACE" ? "race" : "qualifying"
                    }`}>
                    {phaseGroup.phase}
                  </div>

                  {phaseGroup.days.map((group) => {
                    const isToday = isSameDay(group.date, now);

                    const dayLabel = group.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <div
                        key={group.date}
                        className={`session-day-group ${isToday ? "today" : ""}`}>
                        <div
                          className={`session-day ${isToday ? "today" : ""}`}>
                          {dayLabel}
                        </div>

                        {group.sessions.map((s) => {
                          const isLive = s.status === "live";

                          const isHighlight =
                            highlightSession &&
                            Math.abs(s.start - highlightSession.start) < 1000;

                          const countdown = getCountdown(s.start);

                          return (
                            <div
                              key={s.unit_id || s.name}
                              className={`session 
                      ${isLive ? "live" : ""} 
                      ${isHighlight ? "highlight" : ""} 
                      ${s.status === "completed" ? "completed" : ""}
                    `}>
                              <span>{s.name}</span>

                              <div className="session-right">
                                {s.status === "live" ? (
                                  <div className="live-indicator">
                                    <span className="dot" />
                                    LIVE
                                  </div>
                                ) : (
                                  <span className="session-time">
                                    {s.status === "upcoming"
                                      ? countdown
                                      : "Done"}
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
              ))
            : groupedSessions.map((group) => {
                const isToday = isSameDay(group.date, now);

                const dayLabel = group.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={group.date}
                    className={`session-day-group ${isToday ? "today" : ""}`}>
                    <div className={`session-day ${isToday ? "today" : ""}`}>
                      {dayLabel}
                    </div>

                    {group.sessions.map((s) => {
                      const isLive = s.status === "live";

                      const isHighlight =
                        highlightSession &&
                        Math.abs(s.start - highlightSession.start) < 1000;

                      const countdown = getCountdown(s.start);

                      return (
                        <div
                          key={s.unit_id || s.name}
                          className={`session 
                  ${isLive ? "live" : ""} 
                  ${isHighlight ? "highlight" : ""} 
                  ${s.status === "completed" ? "completed" : ""}
                `}>
                          <span>{s.name}</span>

                          <span className="session-time">
                            {s.status === "live" ? (
                              <span className="live-indicator">
                                <span className="dot" />
                                LIVE
                              </span>
                            ) : s.status === "upcoming" ? (
                              countdown
                            ) : (
                              "Done"
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
