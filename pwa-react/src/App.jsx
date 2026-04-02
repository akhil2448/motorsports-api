import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import SeriesCard from "./components/SeriesCard";
import CalendarPage from "./components/CalendarPage";
import NotificationsScreen from "./components/Notifications";
import SplashScreen from "./components/SplashScreen";
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
import { fetchCalendar } from "./services/calendarService";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
// const API_BASE = "http://localhost:3000";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("events");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  const [calendarData, setCalendarData] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [useLocalTime, setUseLocalTime] = useState(false);

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

        // console.log("API DATA:", eventsData);

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

  useEffect(() => {
    async function loadCalendar() {
      try {
        setLoadingCalendar(true);
        const data = await fetchCalendar();
        setCalendarData(data);
      } catch (err) {
        console.error("Calendar preload failed", err);
      } finally {
        setLoadingCalendar(false);
      }
    }

    loadCalendar();
  }, []);

  const handleToggleEvent = (eventId) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, expanded: !e.expanded } : e)),
    );
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const since = new Date(0).toISOString();

        const res = await fetch(`${API_BASE}/notifications?since=${since}`);
        const data = await res.json();

        setNotifications(
          data.notifications.map((n) => ({
            ...n,
            isRead: n.is_read,
          })),
        );

        setUnreadCount(data.unread_count);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    }

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  return (
    <>
      <SplashScreen show={showSplash} />

      <div className="app-container">
        <PageHeader
          title={activeTab.toUpperCase()}
          useLocalTime={useLocalTime}
          setUseLocalTime={setUseLocalTime}
          showToggle={activeTab === "calendar"}
        />

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

        {activeTab === "calendar" && (
          <CalendarPage
            useLocalTime={useLocalTime}
            calendarData={calendarData}
            loading={loadingCalendar}
          />
        )}
        {activeTab === "notifications" && (
          <NotificationsScreen
            notifications={notifications}
            setNotifications={setNotifications}
            setUnreadCount={setUnreadCount}
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
