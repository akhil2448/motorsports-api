const API_BASE = import.meta.env.VITE_API_BASE_URL;

// normalize backend → frontend
function normalizeSeries(series) {
  if (!series) return "f1";
  if (series === "GTWC Europe") return "gtwc";
  return series.toLowerCase();
}

function transformEvent(event) {
  return {
    id: event.id,
    series: normalizeSeries(event.series),
    eventName: event.event_name,
    location: `${event.location}, ${event.country}`,
    startDate: new Date(event.start_date),
    endDate: new Date(event.end_date),
    sessions: [],
  };
}

// pick nearest event per series
function getNearestEventsPerSeries(events) {
  const grouped = {};

  for (const event of events) {
    if (!grouped[event.series]) {
      grouped[event.series] = [];
    }
    grouped[event.series].push(event);
  }

  return Object.values(grouped).map(
    (group) => group.sort((a, b) => a.startDate - b.startDate)[0],
  );
}

export async function getUpcomingEvents() {
  const res = await fetch(`${API_BASE}/events/upcoming`);
  if (!res.ok) throw new Error("Failed to fetch events");

  const data = await res.json();
  const transformed = data.map(transformEvent);

  return getNearestEventsPerSeries(transformed);
}

// ✅ FIXED ENDPOINT + SAFE PARSE
export async function getEventSchedule(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/schedule`);

  if (!res.ok) throw new Error("Failed to fetch schedule");

  const data = await res.json();

  return data
    .map((item) => {
      const start = item.start_time_utc || item.start_time_local;
      if (!start) return null;

      return {
        name: item.session_name || item.stage_name || "Session",
        start: new Date(start),
        end: item.end_time_utc ? new Date(item.end_time_utc) : new Date(start),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}
