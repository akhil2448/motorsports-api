import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import WheelPicker from "./WheelPicker";
import "../styles/components/profile.css";
import ProfileSkeleton from "../components/skeleton/ProfileSkeleton";

import { saveUserPreferences } from "../services/userPreferencesService";

export default function Profile({
  preferences,
  setPreferences,
  loading,
  pushStatus,
  enablePushNotifications,
}) {
  const [enabledSeries, setEnabledSeries] = useState(null);
  const [notifyBefore, setNotifyBefore] = useState(null);
  const [eventStart, setEventStart] = useState(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!preferences || enabledSeries !== null) return;

    const base = {
      F1: false,
      MotoGP: false,
      WRC: false,
      IndyCar: false,
      DTM: false,
      GTWC: false,
      TT: false,
    };

    preferences.followed_series.forEach((s) => {
      if (Object.prototype.hasOwnProperty.call(base, s)) {
        base[s] = true;
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabledSeries(base);
    setNotifyBefore(preferences.notify_before_minutes);
    setEventStart(preferences.notify_event_start);
  }, [preferences, enabledSeries]);

  useEffect(() => {
    if (isEditingTime) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isEditingTime]);

  const toggleSeries = (series) => {
    setEnabledSeries((prev) => {
      const updated = {
        ...prev,
        [series]: !prev[series],
      };
      setIsDirty(true);
      return updated;
    });
  };

  if (loading || !preferences) {
    return <ProfileSkeleton />;
  }

  if (!enabledSeries) return null;

  return (
    <div className="profile-container">
      {/* PUSH NOTIFICATIONS */}
      <div className="section">
        <div className="section-title">Push Notifications</div>

        <div className="row push-row">
          <div>
            <div className="push-title">Race Alerts</div>
            <div className="push-subtext">
              {pushStatus === "unsupported" && "Not supported on this device"}
              {pushStatus === "default" &&
                "Enable alerts for schedule updates and session reminders"}
              {pushStatus === "granted" && "Push notifications enabled"}
              {pushStatus === "denied" &&
                "Notifications are blocked. Re-enable in iPhone Settings > Safari > Notifications or Website Settings."}
              {pushStatus === "unsubscribed" && "Reconnect notifications"}
            </div>
          </div>

          {(pushStatus === "default" || pushStatus === "unsubscribed") && (
            <button
              className="push-enable-btn"
              onClick={enablePushNotifications}>
              Enable
            </button>
          )}

          {pushStatus === "granted" && (
            <div className="push-enabled-pill">Enabled</div>
          )}
        </div>
      </div>

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
              onChange={() => {
                setEventStart((prev) => !prev);
                setIsDirty(true);
              }}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="section">
        <button
          className="done-btn"
          disabled={!isDirty}
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
              setIsDirty(false);

              setShowToast(true);
              setTimeout(() => setShowToast(false), 2000);

              // console.log("✅ Preferences saved");
            } catch (err) {
              console.error("Save failed", err);
            }
          }}>
          Save Preferences
        </button>
      </div>

      {/* PICKER */}
      {isEditingTime &&
        createPortal(
          <div
            className="picker-overlay"
            onClick={() => setIsEditingTime(false)}>
            <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
              <WheelPicker
                value={notifyBefore}
                onChange={(val) => {
                  setNotifyBefore(val);
                  setIsDirty(true);
                }}
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
          </div>,
          document.body,
        )}

      {showToast && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-text">Preferences Saved</div>
          </div>
        </div>
      )}
    </div>
  );
}
