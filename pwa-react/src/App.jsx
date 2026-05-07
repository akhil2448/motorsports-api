import { useEffect, useState, useCallback } from "react";
import { useRef } from "react";
import BottomNav from "./components/BottomNav";
import SeriesCard from "./components/SeriesCard";
import CalendarPage from "./components/CalendarPage";
import NotificationsScreen from "./components/Notifications";
import SplashScreen from "./components/SplashScreen";
import Profile from "./components/Profile";
import PageHeader from "./components/PageHeader";
import { getUserPreferences } from "./services/userPreferencesService";
import EventsSkeleton from "./components/skeleton/EventsSkeleton";

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
  const [pushStatus, setPushStatus] = useState("default");

  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker registered"))
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    async function checkPushStatus() {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("unsupported");
        return;
      }

      const permission = Notification.permission;

      // ❌ blocked by user
      if (permission === "denied") {
        setPushStatus("denied");
        return;
      }

      // ❌ not yet asked
      if (permission === "default") {
        setPushStatus("default");
        return;
      }

      // ✅ permission granted (IMPORTANT FIX)
      setPushStatus("granted");

      // 🔍 OPTIONAL: check subscription (do NOT affect pushStatus)
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        console.log("Push subscription exists:", !!sub);
      } catch (err) {
        console.error("Push status check failed:", err);
      }
    }

    checkPushStatus();
  }, []);

  useEffect(() => {
    if (activeTab !== "profile" || preferences) return;

    async function loadPreferences() {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;

        const prefs = await getUserPreferences(userId);
        setPreferences(prefs);
      } catch (err) {
        console.error("Preferences load failed", err);
      } finally {
        setLoadingPreferences(false);
      }
    }

    loadPreferences();
  }, [activeTab, preferences]);

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
    if (activeTab !== "calendar" || calendarData.length > 0) return;

    async function loadCalendar() {
      try {
        setLoadingCalendar(true);
        const data = await fetchCalendar();
        setCalendarData(data);
      } catch (err) {
        console.error("Calendar load failed", err);
      } finally {
        setLoadingCalendar(false);
      }
    }

    loadCalendar();
  }, [activeTab, calendarData.length]);

  const handleToggleEvent = (eventId) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, expanded: !e.expanded } : e)),
    );
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isFirstLoadRef = useRef(true);
  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(
    async ({ loadMore = false } = {}) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        if (isFirstLoadRef.current && !loadMore) {
          setLoadingNotifications(true);
        }

        const userId = localStorage.getItem("user_id");
        if (!userId) return;

        let url = `${API_BASE}/notifications`;

        if (loadMore && nextCursor) {
          url += `?cursor=${nextCursor}`;
        }

        const res = await fetch(url, {
          headers: { "x-user-id": userId },
        });

        const data = await res.json();

        const mapped = data.notifications.map((n) => ({
          ...n,
          isRead: n.is_read,
        }));

        setNotifications((prev) => {
          const merged = loadMore ? [...prev, ...mapped] : mapped;

          const uniqueMap = new Map();
          for (const n of merged) {
            uniqueMap.set(n.id, n);
          }

          return Array.from(uniqueMap.values());
        });

        setUnreadCount(data.unread_count);
        setNextCursor(data.next_cursor);
        setHasMore(data.has_more);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setLoadingNotifications(false);
        isFirstLoadRef.current = false;
        isFetchingRef.current = false;
      }
    },
    [nextCursor],
  );

  useEffect(() => {
    if (activeTab !== "notifications" && !isFirstLoadRef.current) return;

    fetchNotifications({ loadMore: false });

    const interval = setInterval(
      () => {
        fetchNotifications({ loadMore: false });
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [preferences, activeTab, fetchNotifications]);

  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  async function enablePushNotifications() {
    try {
      if (!("serviceWorker" in navigator)) return;

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            import.meta.env.VITE_VAPID_PUBLIC_KEY,
          ),
        });
      }

      const userId = localStorage.getItem("user_id");

      const res = await fetch(`${API_BASE}/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) {
        throw new Error("Failed to save subscription");
      }

      setPushStatus("granted");
    } catch (err) {
      console.error("Push enable failed:", err);
      setPushStatus("default");
    }
  }

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

        <div key={activeTab} className={`page-content page-${activeTab}`}>
          {activeTab === "events" && (
            <>
              {!showSplash && loadingEvents && <EventsSkeleton />}

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
              loading={loadingNotifications}
              loadMore={() => fetchNotifications({ loadMore: true })}
              hasMore={hasMore}
            />
          )}

          {activeTab === "profile" && (
            <Profile
              preferences={preferences}
              setPreferences={setPreferences}
              loading={loadingPreferences}
              pushStatus={pushStatus}
              enablePushNotifications={enablePushNotifications}
            />
          )}
        </div>

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount > 20 ? "20+" : unreadCount}
        />
      </div>
    </>
  );
}

export default App;
