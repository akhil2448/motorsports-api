import { Flag, Calendar, Bell } from "lucide-react";

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <div className="bottom-nav">
      <button
        className={`nav-item ${activeTab === "events" ? "active" : ""}`}
        onClick={() => setActiveTab("events")}>
        <div className="icon">
          <Flag size={20} />
        </div>
        <div className="label">Events</div>
      </button>

      <button
        className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
        onClick={() => setActiveTab("calendar")}>
        <div className="icon">
          <Calendar size={20} />
        </div>
        <div className="label">Calendar</div>
      </button>

      <button
        className={`nav-item ${activeTab === "updates" ? "active" : ""}`}
        onClick={() => setActiveTab("updates")}>
        <div className="icon">
          <Bell size={20} />
        </div>
        <div className="label">Updates</div>
      </button>
    </div>
  );
}
