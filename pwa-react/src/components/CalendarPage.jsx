import { useState, useEffect } from "react";
import CalendarSeriesCard from "./CalendarSeriesCard";
import { fetchCalendar } from "../services/calendarService";

export default function CalendarPage() {
  // ✅ Persist selected series (used to initialize UI)
  const [expandedSeries, setExpandedSeries] = useState(() => {
    return sessionStorage.getItem("selectedSeries") || null;
  });

  const [useLocalTime, setUseLocalTime] = useState(true);
  const [calendarData, setCalendarData] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await fetchCalendar();
      setCalendarData(data);
    }

    load();
  }, []);

  const handleToggle = (series) => {
    setExpandedSeries((prev) => {
      // ✅ if same → do nothing (stay open)
      if (prev === series) return prev;

      // ✅ if different → switch
      sessionStorage.setItem("selectedSeries", series);
      return series;
    });
  };

  // const now = new Date();

  // const addHours = (date, h) => new Date(date.getTime() + h * 3600000);
  // const addDays = (date, d) => new Date(date.getTime() + d * 86400000);

  // F1 MOCK
  // const generateF1Events = () => {
  //   const events = [];

  //   for (let i = 0; i < 10; i++) {
  //     const base = addDays(now, i * 7);

  //     events.push({
  //       name: `F1 GP ${i + 1}`,
  //       location: "Circuit",
  //       startDate: base,
  //       endDate: addDays(base, 3),
  //       sessions: [
  //         {
  //           name: "Practice 1",
  //           start: addHours(base, 1),
  //           end: addHours(base, 2),
  //         },
  //         {
  //           name: "Practice 2",
  //           start: addHours(base, 4),
  //           end: addHours(base, 5),
  //         },
  //         {
  //           name: "Practice 3",
  //           start: addHours(base, 24),
  //           end: addHours(base, 25),
  //         },
  //         {
  //           name: "Qualifying",
  //           start: addHours(base, 28),
  //           end: addHours(base, 29),
  //         },
  //         { name: "Race", start: addHours(base, 48), end: addHours(base, 50) },
  //       ].map((s) => ({
  //         ...s,
  //         start_time_utc: s.start,
  //         end_time_utc: s.end,
  //         start_time_local: s.start.toLocaleTimeString([], {
  //           hour: "2-digit",
  //           minute: "2-digit",
  //         }),
  //       })),
  //     });
  //   }

  //   return events;
  // };

  // WRC MOCK
  // const generateWRCEvents = () => {
  //   const events = [];

  //   for (let i = 0; i < 5; i++) {
  //     const base = addDays(now, i * 10);
  //     const stages = [];

  //     for (let j = 0; j < 19; j++) {
  //       const start = addHours(base, j * 2);
  //       const end = addHours(start, 1);

  //       stages.push({
  //         name: `Stage ${j + 1}`,
  //         start_time_utc: start,
  //         end_time_utc: end,
  //         start_time_local: start.toLocaleTimeString([], {
  //           hour: "2-digit",
  //           minute: "2-digit",
  //         }),
  //       });
  //     }

  //     const wolfStart = addHours(base, 50);
  //     stages.push({
  //       name: "Wolf Power Stage",
  //       start_time_utc: wolfStart,
  //       end_time_utc: addHours(wolfStart, 1),
  //       start_time_local: wolfStart.toLocaleTimeString([], {
  //         hour: "2-digit",
  //         minute: "2-digit",
  //       }),
  //     });

  //     events.push({
  //       name: `Rally Event ${i + 1}`,
  //       location: "Country",
  //       startDate: base,
  //       endDate: addDays(base, 3),
  //       sessions: stages,
  //     });
  //   }

  //   return events;
  // };

  // const mockData = [
  //   { series: "F1", events: generateF1Events() },
  //   { series: "WRC", events: generateWRCEvents() },
  // ];

  return (
    <div className="app-container">
      {/* TOGGLE */}
      <div className="time-toggle">
        <button
          className={useLocalTime ? "active" : ""}
          onClick={() => setUseLocalTime(true)}>
          Your Time
        </button>

        <button
          className={!useLocalTime ? "active" : ""}
          onClick={() => setUseLocalTime(false)}>
          Track Time
        </button>
      </div>

      {calendarData.map((seriesData) => (
        <CalendarSeriesCard
          key={seriesData.series}
          data={seriesData}
          expanded={expandedSeries === seriesData.series} // ✅ FIXED
          onClick={() => handleToggle(seriesData.series)} // ✅ FIXED
          useLocalTime={useLocalTime}
        />
      ))}
    </div>
  );
}
