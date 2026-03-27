import "../styles/components/splash.css";

export default function SplashScreen({ show }) {
  return (
    <div className={`splash-screen ${show ? "show" : "hide"}`}>
      <div className="splash-content">
        <div className="top-block">
          <img src="/icons/icon-192.png" className="splash-logo" />

          <div className="splash-text">LightsOut</div>
          <div className="caption">Never miss the start</div>
        </div>

        <div className="lights-container">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`light light-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
