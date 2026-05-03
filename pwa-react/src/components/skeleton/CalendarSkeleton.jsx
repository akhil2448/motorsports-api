import "../../styles/components/skeleton.css";

export default function CalendarSkeleton() {
  return (
    <div className="app-container">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="series-card">
          <div className="series-header">
            <div className="logo-container">
              <div className="skeleton" style={{ width: 100, height: 24 }} />
            </div>

            <div className="date-container">
              <div
                className="skeleton"
                style={{ width: 80, height: 16, marginBottom: 6 }}
              />
              <div className="skeleton" style={{ width: 50, height: 12 }} />
            </div>
          </div>

          <div
            className="skeleton"
            style={{ width: "70%", height: 18, marginTop: 10 }}
          />

          <div
            className="skeleton"
            style={{ width: "50%", height: 14, marginTop: 8 }}
          />

          <div
            className="skeleton"
            style={{ width: "100%", height: 14, marginTop: 12 }}
          />
        </div>
      ))}
    </div>
  );
}
