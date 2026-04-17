const crypto = require("crypto");

const MONTH_MAP = {
  May: 4,
  June: 5,
};

// 🔥 helper
function pad(n) {
  return String(n).padStart(2, "0");
}

function normalizeTT({ sessions, lastUpdated }) {
  if (!sessions || sessions.length === 0) {
    return {
      stages: [],
      eventStart: null,
      eventEnd: null,
      hash: null,
      timezone: "Europe/Isle_of_Man",
    };
  }

  // 🔥 derive year dynamically (safe)
  const currentYear = new Date().getUTCFullYear();

  const normalized = sessions.map((s, index) => {
    const monthIndex = MONTH_MAP[s.month];
    const [hour, minute] = s.time.split(":").map(Number);

    // =========================
    // 🔥 SAFE UTC conversion (BST assumed = UTC+1)
    // =========================
    const utcDate = new Date(
      Date.UTC(currentYear, monthIndex, Number(s.date), hour - 1, minute),
    );

    const localDateStr = `${currentYear}-${pad(monthIndex + 1)}-${pad(
      s.date,
    )} ${s.time}`;

    return {
      name: s.name,
      group: s.group,
      phase: s.phase, // ✅ IMPORTANT
      stage_order: index + 1,
      start_time_utc: utcDate,
      start_time_local: localDateStr,
      timezone: "Europe/Isle_of_Man",
    };
  });

  // =========================
  // 🔥 SORT (CRITICAL)
  // =========================
  const sorted = normalized.sort((a, b) => a.start_time_utc - b.start_time_utc);

  // =========================
  // 🔥 EVENT RANGE
  // =========================
  const eventStart = sorted[0]?.start_time_utc || null;
  const eventEnd = sorted[sorted.length - 1]?.start_time_utc || null;

  // =========================
  // 🔥 HASH (based on page update)
  // =========================
  const hash = crypto
    .createHash("md5")
    .update(lastUpdated || "")
    .digest("hex");

  return {
    stages: sorted, // ✅ FIXED
    eventStart,
    eventEnd,
    hash,
    timezone: "Europe/Isle_of_Man",
  };
}

module.exports = { normalizeTT };
