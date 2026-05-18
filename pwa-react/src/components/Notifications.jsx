import { useEffect, useRef } from "react";

import NotificationItem from "../components/NotificationItem";
import "../styles/components/notifications.css";
import NotificationSkeleton from "../components/skeleton/NotificationSkeleton";
import emptyIcon from "../assets/icons/notification-empty.svg";

function groupNotifications(notifications) {
  const groups = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  const now = new Date();

  notifications.forEach((n) => {
    const date = new Date(n.created_at);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const diffDays = Math.floor((today - itemDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) groups.today.push(n);
    else if (diffDays === 1) groups.yesterday.push(n);
    else groups.earlier.push(n);
  });

  return groups;
}

export default function Notifications({
  notifications,
  setNotifications,
  setUnreadCount,
  loading,
  loadMore,
  hasMore,
}) {
  const loadMoreRef = useRef(null);

  // 🔒 REQUEST LOCK
  const isFetchingRef = useRef(false);

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const grouped = groupNotifications(sorted);

  // ✅ INFINITE SCROLL + LOCK
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current) {
          isFetchingRef.current = true;

          Promise.resolve(loadMore()).finally(() => {
            isFetchingRef.current = false;
          });
        }
      },
      {
        rootMargin: "200px",
      },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (loading) {
    return <NotificationSkeleton />;
  }

  // ✅ EMPTY STATE
  if (!loading && sorted.length === 0) {
    return (
      <div className="notifications-container empty">
        <div className="empty-state">
          <img src={emptyIcon} alt="No notifications" className="empty-icon" />
          <div className="empty-title">No notifications yet</div>
          <div className="empty-subtitle">
            Stay tuned for the next RAWE CEEK!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-list">
        {/* TODAY */}
        {grouped.today.length > 0 && (
          <>
            <div className="section-title">Today</div>
            {grouped.today.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                setNotifications={setNotifications}
                setUnreadCount={setUnreadCount}
              />
            ))}
          </>
        )}

        {/* YESTERDAY */}
        {grouped.yesterday.length > 0 && (
          <>
            <div className="section-title">Yesterday</div>
            {grouped.yesterday.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                setNotifications={setNotifications}
                setUnreadCount={setUnreadCount}
              />
            ))}
          </>
        )}

        {/* EARLIER */}
        {grouped.earlier.length > 0 && (
          <>
            <div className="section-title">Earlier</div>
            {grouped.earlier.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                setNotifications={setNotifications}
                setUnreadCount={setUnreadCount}
              />
            ))}
          </>
        )}

        {/* 🔥 LOAD MORE TRIGGER */}
        {hasMore && <div ref={loadMoreRef} className="load-more-trigger" />}

        {/* 🔄 LOADING TEXT */}
        {hasMore && <div className="loading-more">Loading more...</div>}
      </div>
    </div>
  );
}
