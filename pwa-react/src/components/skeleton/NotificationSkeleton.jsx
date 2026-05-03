import "../../styles/components/skeleton.css";

export default function NotificationSkeleton() {
  return (
    <div className="notifications-container">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="notification-item">
          <div className="notification-header">
            <div className="skeleton" style={{ width: 60, height: 12 }} />
            <div className="skeleton" style={{ width: 40, height: 12 }} />
          </div>

          <div
            className="skeleton"
            style={{ width: "80%", height: 16, marginTop: 10 }}
          />

          <div
            className="skeleton"
            style={{ width: "60%", height: 14, marginTop: 6 }}
          />
        </div>
      ))}
    </div>
  );
}
