const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Fetch full calendar (year view)
 */
export async function fetchCalendar() {
  try {
    const res = await fetch(`${API_BASE}/calendar`);

    if (!res.ok) {
      throw new Error("Failed to fetch calendar");
    }

    const data = await res.json();

    return data;
  } catch (err) {
    console.error("Calendar fetch error:", err);
    return [];
  }
}

/**
 * Fetch live-only calendar
 */
export async function fetchLiveCalendar() {
  try {
    const res = await fetch(`${API_BASE}/calendar/live`);

    if (!res.ok) {
      throw new Error("Failed to fetch live calendar");
    }

    const data = await res.json();

    return data;
  } catch (err) {
    console.error("Live calendar fetch error:", err);
    return [];
  }
}
