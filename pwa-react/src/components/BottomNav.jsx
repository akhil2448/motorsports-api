import { Flag, Calendar, Bell, User } from "lucide-react";

export default function BottomNav({ activeTab, setActiveTab, unreadCount }) {
  return (
    <div className="bottom-nav">
      {/* EVENTS */}
      <button
        className={`nav-item ${activeTab === "events" ? "active" : ""}`}
        onClick={() => setActiveTab("events")}>
        <div className="icon">
          <Flag size={20} />
        </div>
        <div className="label">Events</div>
      </button>

      {/* CALENDAR */}
      <button
        className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
        onClick={() => setActiveTab("calendar")}>
        <div className="icon">
          <Calendar size={20} />
        </div>
        <div className="label">Calendar</div>
      </button>

      {/* NOTIFICATIONS */}
      <button
        className={`nav-item ${activeTab === "notifications" ? "active" : ""}`}
        onClick={() => setActiveTab("notifications")}>
        <div className="icon bell-icon">
          <Bell size={20} />

          {/* ✅ Badge */}
          {unreadCount > 0 && (
            <span className="badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        <div className="label">Notifications</div>
      </button>

      {/* USER SETTINGS */}
      <button
        className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
        onClick={() => setActiveTab("profile")}>
        <div className="icon">
          <User size={20} />
        </div>
        <div className="label">Profile</div>
      </button>
    </div>
  );
}
