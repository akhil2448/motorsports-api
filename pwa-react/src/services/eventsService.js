const API_BASE = import.meta.env.VITE_API_BASE_URL;

function normalizeSeries(series) {
  if (!series) return "f1";
  if (series === "GTWC Europe") return "gtwc";
  return series.toLowerCase();
}

function transformEvent(event) {
  return {
    id: event.id,
    series: normalizeSeries(event.series),
    event_name: event.event_name,
    location: `${event.location}, ${event.country}`,

    event_start: event.event_start,
    event_end: event.event_end,

    sessions: event.sessions || [], // ✅ KEEP backend data
    status: event.status, // ✅ ALSO IMPORTANT
  };
}

export async function getUpcomingEvents() {
  const res = await fetch(`${API_BASE}/events/upcoming`);
  if (!res.ok) throw new Error("Failed to fetch events");

  const data = await res.json();

  return data.map(transformEvent); // ✅ no filtering
}

export async function getEventSchedule(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/schedule`);

  if (!res.ok) throw new Error("Failed to fetch schedule");

  const data = await res.json();

  return data
    .map((item) => {
      if (!item.start_time) return null;

      return {
        unit_id: item.unit_id,
        name: item.name,
        start: new Date(item.start_time),
        end: item.end_time ? new Date(item.end_time) : null,

        // ✅ NEW (critical for TT grouping)
        phase: item.phase || null,
        status: item.status,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}
