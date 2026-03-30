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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const [activeTab, setActiveTab] = useState("events");

  // EVENTS STATE
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);

        const eventsData = await getUpcomingEvents();

        // 🔥 fetch all schedules in parallel
        const eventsWithSessions = await Promise.all(
          eventsData.map(async (event) => {
            try {
              const sessions = await getEventSchedule(event.id);

              return {
                id: event.id,
                series: event.series,
                event_name: event.event_name,
                location: event.location,
                event_start: event.event_start,
                event_end: event.event_end,
                sessions: sessions || [],
              };
            } catch (err) {
              return {
                id: event.id,
                series: event.series,
                event_name: event.event_name,
                location: event.location,
                event_start: event.event_start,
                event_end: event.event_end,
                sessions: [],
              };
            }
          }),
        );

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

  // ✅ TOGGLE + FETCH SESSIONS
  const handleToggleEvent = (eventId) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, expanded: !e.expanded } : e)),
    );
  };

  // NOTIFICATIONS
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

        {/* EVENTS TAB */}
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
