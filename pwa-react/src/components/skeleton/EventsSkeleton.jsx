import "../../styles/components/skeleton.css";

export default function EventsSkeleton() {
  return (
    <div className="app-container">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="series-card">
          {/* Accent bar (optional visual polish) */}
          <div className="accent" />

          {/* HEADER */}
          <div className="series-header">
            <div className="logo-container">
              <div className="skeleton" style={{ width: 110, height: 24 }} />
            </div>

            <div className="date-container">
              <div
                className="skeleton"
                style={{ width: 100, height: 16, marginBottom: 6 }}
              />
              <div className="skeleton" style={{ width: 50, height: 12 }} />
            </div>
          </div>

          {/* EVENT NAME */}
          <div
            className="skeleton"
            style={{ width: "70%", height: 18, marginTop: 8 }}
          />

          {/* LOCATION */}
          <div
            className="skeleton"
            style={{ width: "50%", height: 14, marginTop: 6 }}
          />

          {/* SESSION PREVIEW */}
          <div style={{ marginTop: 12 }}>
            <div
              className="skeleton"
              style={{ width: "80%", height: 14, marginBottom: 6 }}
            />
            <div className="skeleton" style={{ width: "40%", height: 12 }} />
          </div>

          {/* SESSIONS LIST PREVIEW */}
          <div style={{ marginTop: 14 }}>
            {[...Array(3)].map((_, j) => (
              <div
                key={j}
                className="skeleton"
                style={{
                  width: "100%",
                  height: 12,
                  marginBottom: 8,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
