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

import { getUpcomingEvents, getEventSchedule } from "./services/eventsService";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("events");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);

        const eventsData = await getUpcomingEvents();

        const eventsWithSessions = await Promise.all(
          eventsData.map(async (event) => {
            let sessions = [];

            try {
              sessions = await getEventSchedule(event.id);
            } catch {
              sessions = [];
            }

            return {
              ...event, // ✅ preserve ALL backend fields (critical fix)
              sessions: Array.isArray(sessions) ? sessions : [],
            };
          }),
        );

        console.log("API DATA:", eventsData);

        setEvents(eventsWithSessions);
      } catch (err) {
        console.error(err);
        setEventsError(err.message);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, []);

  const handleToggleEvent = (eventId) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, expanded: !e.expanded } : e)),
    );
  };

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : mockNotifications;
  });

  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <SplashScreen show={showSplash} />

      <div className="app-container">
        <PageHeader title={activeTab.toUpperCase()} />

        {activeTab === "events" && (
          <>
            {loadingEvents && <div className="status">Loading events...</div>}

            {eventsError && (
              <div className="status error">Failed to load events</div>
            )}

            {!loadingEvents &&
              !eventsError &&
              events.map((event) => (
                <SeriesCard
                  key={event.id}
                  event={event}
                  expanded={event.expanded}
                  onToggle={() => handleToggleEvent(event.id)}
                />
              ))}
          </>
        )}

        {activeTab === "calendar" && <CalendarPage />}
        {activeTab === "notifications" && (
          <NotificationsScreen
            notifications={notifications}
            setNotifications={setNotifications}
          />
        )}
        {activeTab === "profile" && <Profile />}

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
