import { useState } from "react";
import BottomNav from "./components/BottomNav";
import SeriesCard from "./components/SeriesCard";
import CalendarPage from "./components/CalendarPage";

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components/bottom-nav.css";
import "./styles/components/series-card.css";

function App() {
  const [activeTab, setActiveTab] = useState("events");

  const now = new Date();

  const mockEvents = [
    // FUTURE EVENT
    {
      series: "F1",
      eventName: "Australian Grand Prix",
      location: "Melbourne",
      startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      sessions: [
        {
          name: "Practice 1",
          start: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 2.1 * 24 * 60 * 60 * 1000),
        },
        {
          name: "Qualifying",
          start: new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 2.6 * 24 * 60 * 60 * 1000),
        },
      ],
    },

    // ONGOING EVENT
    {
      series: "MotoGP",
      eventName: "Qatar GP",
      location: "Lusail",
      startDate: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      sessions: [
        {
          name: "Practice",
          start: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          end: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
        {
          name: "Qualifying",
          start: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 1 * 60 * 60 * 1000), // LIVE
        },
        {
          name: "Race",
          start: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        },
      ],
    },

    // WRC (stages)
    {
      series: "WRC",
      eventName: "Rally Sweden",
      location: "Umeå",
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      sessions: [
        {
          name: "Stage 1",
          start: new Date(now.getTime() - 20 * 60 * 60 * 1000),
          end: new Date(now.getTime() - 19 * 60 * 60 * 1000),
        },
        {
          name: "Stage 2",
          start: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 1 * 60 * 60 * 1000), // LIVE
        },
      ],
    },

    // UPCOMING (event started, no live session)
    {
      series: "IndyCar",
      eventName: "Long Beach GP",
      location: "California",
      startDate: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      sessions: [
        {
          name: "Practice",
          start: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          end: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        },
        {
          name: "Qualifying",
          start: new Date(now.getTime() + 1 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        },
      ],
    },
  ];

  return (
    <div className="app-container">
      <h1 style={{ paddingBottom: "20px" }}>{activeTab.toUpperCase()}</h1>

      {/* EVENTS TAB */}
      {activeTab === "events" &&
        mockEvents.map((event, i) => <SeriesCard key={i} event={event} />)}

      {/* CALENDAR TAB */}
      {activeTab === "calendar" && <CalendarPage />}

      {/* (placeholder for future) */}
      {activeTab === "updates" && (
        <div style={{ color: "#888" }}>No updates yet</div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
