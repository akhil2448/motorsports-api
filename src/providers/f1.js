require("../../src/config/env");
const axios = require("axios");

const BASE_URL = "https://api.openf1.org/v1";

/* =========================
   OFFSET HELPERS
========================= */

function parseOffsetToMinutes(offsetStr) {
  if (!offsetStr) return 0;

  // "-04:00:00" OR "03:00:00"
  const sign = offsetStr.startsWith("-") ? -1 : 1;

  const clean = offsetStr.replace(/[+-]/, "");
  const [hours, minutes] = clean.split(":").map(Number);

  return sign * (hours * 60 + minutes);
}

function formatOffset(offsetStr) {
  if (!offsetStr) return "UTC+00:00";

  const sign = offsetStr.startsWith("-") ? "-" : "+";
  const clean = offsetStr.replace(/[+-]/, "");

  const [hours, minutes] = clean.split(":");

  return `UTC${sign}${hours}:${minutes}`;
}

function toSQLTimestamp(date) {
  return date.toISOString().replace("T", " ").substring(0, 19);
}

/* =========================
   FETCH
========================= */

async function fetch() {
  const currentYear = new Date().getFullYear();

  const response = await axios.get(`${BASE_URL}/sessions?year=${currentYear}`, {
    timeout: 15000,
  });

  const sessions = response.data;

  const meetings = {};

  /* =========================
     GROUP SESSIONS BY MEETING
  ========================= */

  sessions.forEach((session) => {
    const meetingKey = session.meeting_key;

    if (!meetings[meetingKey]) {
      meetings[meetingKey] = {
        meeting_key: meetingKey,
        location: session.location,
        country: session.country_name,
        circuit: session.circuit_short_name,
        start: session.date_start,
        sessions: [],
      };
    }

    meetings[meetingKey].sessions.push({
      external_id: session.session_key,
      name: session.session_name,
      type: session.session_type,
      start: session.date_start,
      end: session.date_end,
      gmt_offset: session.gmt_offset,
    });
  });

  const meetingsArray = Object.values(meetings);

  /* =========================
     SORT MEETINGS
  ========================= */

  meetingsArray.sort((a, b) => new Date(a.start) - new Date(b.start));

  meetingsArray.forEach((meeting) => {
    meeting.sessions.sort((a, b) => new Date(a.start) - new Date(b.start));
  });

  /* =========================
     REMOVE TEST EVENTS
  ========================= */

  const raceMeetings = meetingsArray.filter((meeting) => {
    const firstSession = meeting.sessions[0].name;
    return !firstSession.includes("Day");
  });

  /* =========================
     MAP EVENTS
  ========================= */

  const events = raceMeetings.map((meeting, index) => {
    const startDate = meeting.sessions[0].start.split("T")[0];
    const endDate =
      meeting.sessions[meeting.sessions.length - 1].end.split("T")[0];

    return {
      external_id: meeting.meeting_key,
      name: `${meeting.country} Grand Prix`,
      location: meeting.location,
      country: meeting.country,
      start_date: startDate,
      end_date: endDate,
      round: index + 1,

      units: meeting.sessions.map((session, i) => {
        const rawOffset = session.gmt_offset || "00:00:00";

        const startUtc = session.start;
        const endUtc = session.end;

        const offsetMinutes = parseOffsetToMinutes(rawOffset);

        const startLocal = new Date(
          new Date(startUtc).getTime() + offsetMinutes * 60000,
        );

        const endLocal = new Date(
          new Date(endUtc).getTime() + offsetMinutes * 60000,
        );

        const eventTimezone = formatOffset(rawOffset);

        return {
          type: "session",
          external_id: session.external_id,
          name: session.name,
          session_type: session.type,

          start_time: startUtc,
          end_time: endUtc,

          start_time_local: toSQLTimestamp(startLocal),
          end_time_local: toSQLTimestamp(endLocal),

          event_timezone: eventTimezone,

          order: i + 1,
        };
      }),
    };
  });

  return {
    series: {
      name: "Formula One",
      short_name: "F1",
    },
    events,
  };
}

module.exports = { fetch };
