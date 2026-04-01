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

module.exports = {
  buildTrackTimes,
};
