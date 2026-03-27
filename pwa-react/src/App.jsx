import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import SeriesCard from "./components/SeriesCard";
import CalendarPage from "./components/CalendarPage";
import NotificationsScreen from "./components/Notifications";
import SplashScreen from "./components/SplashScreen";
import { mockNotifications } from "./mock/notifications";
import Profile from "./components/Profile";
import PageHeader from "./components/PageHeader";

import "./styles/components/splash.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components/bottom-nav.css";
import "./styles/components/series-card.css";
import "./styles/components/notifications.css";
import "./styles/components/page-header.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("events");

  // Splash timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // INIT FROM LOCALSTORAGE
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : mockNotifications;
  });

  // PERSIST TO LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const now = new Date();

  const mockEvents = [
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
          end: new Date(now.getTime() + 1 * 60 * 60 * 1000),
        },
        {
          name: "Race",
          start: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        },
      ],
    },
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
          end: new Date(now.getTime() + 1 * 60 * 60 * 1000),
        },
      ],
    },
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
    <>
      {showSplash && <SplashScreen />}

      <div className="app-container">
        {/* HEADER */}
        <PageHeader title={activeTab.toUpperCase()} />

        {/* EVENTS TAB */}
        {activeTab === "events" &&
          mockEvents.map((event, i) => <SeriesCard key={i} event={event} />)}

        {/* CALENDAR TAB */}
        {activeTab === "calendar" && <CalendarPage />}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <NotificationsScreen
            notifications={notifications}
            setNotifications={setNotifications}
          />
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && <Profile />}

        {/* NAV */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
        />
      </div>
    </>
  );
}

export default App;
