import { useState } from "react";
import CalendarSeriesCard from "./CalendarSeriesCard";

export default function CalendarPage({ useLocalTime, calendarData, loading }) {
  // USE THIS LOGIC IF THERE IS ANY ISSUE WITH THE SIX_HOURS STORING OF
  // SEESION STORAGE OF SAVING OLD USER SERIES SELECTION
  // ✅ Persist selected series (used to initialize UI)
  // const [expandedSeries, setExpandedSeries] = useState(() => {
  //   return sessionStorage.getItem("selectedSeries") || null;
  // });

  const SERIES_ORDER = {
    F1: 1,
    INDYCAR: 2,
    DTM: 3,
    GTWC: 4,
    WRC: 5,
    MOTOGP: 6,
  };

  const [expandedSeries, setExpandedSeries] = useState(() => {
    const saved = sessionStorage.getItem("selectedSeries");

    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);

      // ✅ HANDLE OLD FORMAT (string like "F1")
      if (typeof parsed === "string") {
        sessionStorage.removeItem("selectedSeries");
        return null;
      }

      const { value, timestamp } = parsed;

      const SIX_HOURS = 6 * 60 * 60 * 1000;

      if (Date.now() - timestamp < SIX_HOURS) {
        return value;
      } else {
        sessionStorage.removeItem("selectedSeries");
        return null;
      }
    } catch {
      sessionStorage.removeItem("selectedSeries");
      return null;
    }
  });

  const handleToggle = (series) => {
    setExpandedSeries((prev) => {
      // ✅ if same → do nothing (stay open)
      if (prev === series) return prev;

      // ✅ if different → switch
      sessionStorage.setItem(
        "selectedSeries",
        JSON.stringify({
          value: series,
          timestamp: Date.now(),
        }),
      );
      return series;
    });
  };

  if (loading) {
    return <div className="status">Loading calendar...</div>;
  }

  return (
    <div className="app-container">
      {[...calendarData]
        .sort((a, b) => {
          const orderA = SERIES_ORDER[a.series] ?? 999;
          const orderB = SERIES_ORDER[b.series] ?? 999;
          return orderA - orderB;
        })
        .map((seriesData) => (
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
