import { useState } from "react";
import WheelPicker from "./WheelPicker";
import "../styles/components/profile.css";

import { saveUserPreferences } from "../services/userPreferencesService";

export default function Profile({ preferences, setPreferences, loading }) {
  const [enabledSeries, setEnabledSeries] = useState(null);
  const [notifyBefore, setNotifyBefore] = useState(null);
  const [eventStart, setEventStart] = useState(null);
  const [isEditingTime, setIsEditingTime] = useState(false);

  const toggleSeries = (series) => {
    setEnabledSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }));
  };

  if (loading || !preferences) {
    return <div className="status">Loading preferences...</div>;
  }

  if (enabledSeries === null) {
    const base = {
      F1: false,
      MotoGP: false,
      WRC: false,
      IndyCar: false,
      DTM: false,
      GTWC: false,
    };

    preferences.followed_series.forEach((s) => {
      if (Object.prototype.hasOwnProperty.call(base, s)) {
        base[s] = true;
      }
    });

    setEnabledSeries(base);
    setNotifyBefore(preferences.notify_before_minutes);
    setEventStart(preferences.notify_event_start);
  }

  if (!enabledSeries) return null;

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

        <div className="row">
          <span>{notifyBefore} min</span>

          <button className="edit-btn" onClick={() => setIsEditingTime(true)}>
            Edit
          </button>
        </div>
      </div>

      {/* EVENT START */}
      <div className="section">
        <div className="section-title">Event Start</div>

        <div className="row">
          <span>Notify at event start</span>

          <label className="switch">
            <input
              type="checkbox"
              checked={eventStart}
              onChange={() => setEventStart((prev) => !prev)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="section">
        <button
          className="done-btn"
          onClick={async () => {
            try {
              const followedSeries = Object.keys(enabledSeries).filter(
                (s) => enabledSeries[s],
              );

              const payload = {
                user_id: preferences.user_id,
                followed_series: followedSeries,
                notify_before_minutes: notifyBefore,
                notify_event_start: eventStart,
              };

              const updated = await saveUserPreferences(payload);

              setPreferences(updated);

              console.log("✅ Preferences saved");
            } catch (err) {
              console.error("Save failed", err);
            }
          }}>
          Save Preferences
        </button>
      </div>

      {/* PICKER */}
      {isEditingTime && (
        <div className="picker-overlay" onClick={() => setIsEditingTime(false)}>
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
  );
}
