const axios = require("axios");

const BASE_URL = "https://api.openf1.org/v1";

async function fetch() {
  const currentYear = new Date().getFullYear();

  const response = await axios.get(`${BASE_URL}/sessions?year=${currentYear}`, {
    timeout: 15000,
  });

  const sessions = response.data;

  const meetings = {};

  /* GROUP SESSIONS BY MEETING */

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
    });
  });

  const meetingsArray = Object.values(meetings);

  /* SORT MEETINGS */

  meetingsArray.sort((a, b) => new Date(a.start) - new Date(b.start));

  meetingsArray.forEach((meeting) => {
    meeting.sessions.sort((a, b) => new Date(a.start) - new Date(b.start));
  });

  /* REMOVE TEST EVENTS */

  const raceMeetings = meetingsArray.filter((meeting) => {
    const firstSession = meeting.sessions[0].name;
    return !firstSession.includes("Day");
  });

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

      units: meeting.sessions.map((session, i) => ({
        type: "session",
        external_id: session.external_id,
        name: session.name,
        session_type: session.type,
        start_time: session.start,
        end_time: session.end,
        order: i + 1,
      })),
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
