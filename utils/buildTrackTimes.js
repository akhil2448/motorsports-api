const { DateTime } = require("luxon");

function normalizeOffset(offsetStr) {
  if (!offsetStr) return "+00:00";

  // "-04:00:00" → "-04:00"
  if (offsetStr.includes(":")) {
    const sign = offsetStr.startsWith("-") ? "-" : "+";
    const clean = offsetStr.replace(/[+-]/, "");
    const [hours, minutes] = clean.split(":");

    return `${sign}${hours}:${minutes}`;
  }

  return offsetStr;
}

function parseOffsetToMinutes(offsetStr) {
  if (!offsetStr) return 0;

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

function buildTrackTimes({ startUtc, endUtc, offsetStr }) {
  const normalizedOffset = normalizeOffset(offsetStr);

  const offsetMinutes = parseOffsetToMinutes(normalizedOffset);

  const startLocal = new Date(
    new Date(startUtc).getTime() + offsetMinutes * 60000,
  );

  const endLocal = endUtc
    ? new Date(new Date(endUtc).getTime() + offsetMinutes * 60000)
    : null;

  return {
    start_time: startUtc,
    end_time: endUtc,

    start_time_local: toSQLTimestamp(startLocal),
    end_time_local: endLocal ? toSQLTimestamp(endLocal) : null,

    event_timezone: formatOffset(normalizedOffset),
  };
}

function buildTrackTimesFromLocal({ dayStr, timeStr, year, zone }) {
  try {
    if (!timeStr || !dayStr) {
      return {
        start_time: null,
        end_time: null,
        start_time_local: null,
        end_time_local: null,
        event_timezone: "UTC+00:00",
      };
    }

    const cleanTime = timeStr.replace(/ET|CT|PT|GMT/gi, "").trim();

    const dateTimeStr = `${dayStr} ${year} ${cleanTime}`;

    const dt = DateTime.fromFormat(dateTimeStr, "EEEE, MMM d yyyy h:mma", {
      zone,
      setZone: true,
    });

    if (!dt.isValid) {
      return {
        start_time: null,
        end_time: null,
        start_time_local: null,
        end_time_local: null,
        event_timezone: "UTC+00:00",
      };
    }

    const utc = dt.toUTC();
    const offset = dt.offset;

    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);

    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const mins = String(abs % 60).padStart(2, "0");

    return {
      start_time: utc.toISO(),
      end_time: null,

      start_time_local: dt.toFormat("yyyy-MM-dd HH:mm:ss"),
      end_time_local: null,

      event_timezone: `UTC${sign}${hours}:${mins}`,
    };
  } catch {
    return {
      start_time: null,
      end_time: null,
      start_time_local: null,
      end_time_local: null,
      event_timezone: "UTC+00:00",
    };
  }
}

module.exports = {
  buildTrackTimes,
  buildTrackTimesFromLocal,
};
