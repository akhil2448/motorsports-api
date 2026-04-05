import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import SeriesCard from "./components/SeriesCard";
import CalendarPage from "./components/CalendarPage";
import NotificationsScreen from "./components/Notifications";
import SplashScreen from "./components/SplashScreen";
import Profile from "./components/Profile";
import PageHeader from "./components/PageHeader";
import { getOrCreateUser } from "./services/userManager";
import { getUserPreferences } from "./services/userPreferencesService";

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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function requestPushPermission() {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Permission denied");
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BAGut_ghSPJVhgPw3aFXKp6Y-tqQ4umOYV4zHpXupHamgF1Uxz72-bbnzx0eRe9vLauW7TtPTlt0Bdh3lYfue8Y",
        ),
      });
    }

    const userId = localStorage.getItem("user_id");

    await fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(subscription),
    });

    console.log("Push enabled");
  } catch (err) {
    console.error("Push setup error:", err);
  }
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState("events");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  const [calendarData, setCalendarData] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [useLocalTime, setUseLocalTime] = useState(false);

  const [preferences, setPreferences] = useState(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  const [showPermissionUI, setShowPermissionUI] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker registered"))
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const userId = await getOrCreateUser();

        const prefs = await getUserPreferences(userId);

        setPreferences(prefs);
      } catch (err) {
        console.error("Init failed", err);
      } finally {
        setLoadingPreferences(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (preferences) {
      // console.log("Preferences updated:", preferences);
    }
  }, [preferences]);

  //SPLASH SCREEN TIMEOUT - 4000
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // ALLOW NOTIFICATIONS FOR NEW DEVICE/USER
  useEffect(() => {
    if (Notification.permission === "default") {
      setShowPermissionUI(true);
    }
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
        const userId = localStorage.getItem("user_id");
        if (!userId) return; // 🚫 wait until user exists

        const since = new Date(0).toISOString();

        const res = await fetch(`${API_BASE}/notifications?since=${since}`, {
          headers: {
            "x-user-id": userId,
          },
        });

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
  }, [preferences]); // 🔥 KEY CHANGE

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
        {activeTab === "profile" && (
          <Profile
            preferences={preferences}
            setPreferences={setPreferences}
            loading={loadingPreferences}
          />
        )}

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
        />
      </div>

      {showPermissionUI && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-text">
              Enable notifications for race alerts
            </div>

            <button
              className="done-btn"
              style={{ marginTop: "16px" }}
              onClick={requestPushPermission}>
              Allow Notifications
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
