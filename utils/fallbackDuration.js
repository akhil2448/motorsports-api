function getFallbackEndTime({ series, session, event }) {
  const normalizeSeries = (s) => {
    if (!s) return "";

    const str = s.toLowerCase();

    if (str.includes("motogp")) return "MotoGP";
    if (str.includes("indycar")) return "IndyCar";
    if (str.includes("wrc")) return "WRC";
    if (str.includes("gtwc")) return "GTWC";
    if (str.includes("tt")) return "TT";

    return s;
  };

  const normalizedSeries = normalizeSeries(series);

  const name = session.name?.toLowerCase() || "";
  const type = session.session_type?.toLowerCase() || "";
  const eventName = event.name?.toLowerCase() || "";

  const start = new Date(session.start_time_utc);

  let duration = null;

  // =========================
  // TT (Isle of Man TT)
  // =========================
  if (normalizedSeries === "TT") {
    const phase = session.phase?.toLowerCase();

    // =========================
    // QUALIFYING
    // =========================
    if (phase === "qualifying") {
      if (name.includes("supersport") || name.includes("sportbike")) {
        duration = 45;
      } else if (name.includes("sidecar")) {
        duration = 35;
      } else if (name.includes("superbike") || name.includes("superstock")) {
        duration = 50;
      }
    }

    // =========================
    // RACE
    // =========================
    else if (phase === "race") {
      if (name.includes("superstock") || name.includes("sidecar")) {
        duration = 60;
      } else if (name.includes("supersport") || name.includes("sportbike")) {
        duration = 80;
      } else if (name.includes("superbike") || name.includes("senior")) {
        duration = 120;
      } else {
        duration = 90; // fallback safety
      }
    }
  }

  // =========================
  // WRC
  // =========================
  if (normalizedSeries === "WRC") {
    if (name.includes("power stage")) duration = 15;
    else duration = 20;
  }

  // =========================
  // MotoGP
  // =========================
  else if (normalizedSeries === "MotoGP") {
    if (name.includes("sprint")) duration = 20;
    else if (name.includes("race")) duration = 45;
  }

  // =========================
  // IndyCar
  // =========================
  else if (normalizedSeries === "IndyCar") {
    if (type.includes("practice") || name.includes("practice")) duration = 75;
    else if (type.includes("warm") || name.includes("warm")) duration = 25;
    else if (type.includes("qualifying") || name.includes("qual"))
      duration = 60;
    else if (type.includes("race") || name.includes("race")) {
      if (eventName.includes("indianapolis")) duration = 180;
      else duration = 120;
    }
  }

  // =========================
  // GTWC
  // =========================
  else if (normalizedSeries === "GTWC") {
    if (type.includes("practice") || name.includes("practice")) duration = 90;
    else if (type.includes("qualifying") || name.includes("qual"))
      duration = 20;
    else if (type.includes("race") || name.includes("race")) {
      const raceSessions = event.sessions.filter((s) => {
        const t = s.session_type?.toLowerCase() || "";
        const n = s.name?.toLowerCase() || "";
        return t.includes("race") || n.includes("race");
      });

      // Sprint (2 races)
      if (raceSessions.length === 2) {
        duration = 60;
      } else {
        if (eventName.includes("24")) duration = 1440;
        else if (eventName.includes("paul ricard")) duration = 360;
        else duration = 180;
      }
    }
  }

  // =========================
  // FINAL
  // =========================
  if (!duration) return null;

  return new Date(start.getTime() + duration * 60000);
}

module.exports = {
  getFallbackEndTime,
};
