import { useState } from "react";
import WheelPicker from "./WheelPicker";
import "../styles/components/profile.css";

export default function Profile() {
  const [enabledSeries, setEnabledSeries] = useState({
    F1: true,
    MotoGP: true,
    WRC: true,
    IndyCar: true,
    DTM: true,
    GTWC: true,
  });

  const [notifyBefore, setNotifyBefore] = useState(30);
  const [isEditingTime, setIsEditingTime] = useState(false);

  const toggleSeries = (series) => {
    setEnabledSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }));
  };

  return (
    <div className="profile-container">
      {/* NOTIFICATIONS */}
      <div className="section">
        <div className="section-title">Notifications</div>

        {Object.keys(enabledSeries).map((series) => (
          <div key={series} className="row">
            <span>{series}</span>

            <label className="switch">
              <input
                type="checkbox"
                checked={enabledSeries[series]}
                onChange={() => toggleSeries(series)}
              />
              <span className="slider"></span>
            </label>
          </div>
        ))}
      </div>

      {/* NOTIFY BEFORE */}
      <div className="section">
        <div className="section-title">Notify Before</div>

        {/* Compact row */}
        <div className="row">
          <span>{notifyBefore} min</span>

          <button className="edit-btn" onClick={() => setIsEditingTime(true)}>
            Edit
          </button>
        </div>

        {/* Picker overlay */}
        {isEditingTime && (
          <div
            className="picker-overlay"
            onClick={() => setIsEditingTime(false)}>
            <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
              <WheelPicker
                value={notifyBefore}
                onChange={setNotifyBefore}
                options={[5, 10, 15, 30, 45, 60]}
              />

              <button
                className="done-btn"
                onClick={() => {
                  document.getElementById("wheel-commit")?.click();
                  setIsEditingTime(false);
                }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
