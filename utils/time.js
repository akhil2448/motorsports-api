function convertStageToUTC(dateStr, timeStr, timezone) {
  try {
    if (!dateStr || !timeStr || !timezone) {
      console.log("Missing inputs:", dateStr, timeStr, timezone);
      return null;
    }

    // ✅ Extract offset (supports UTC+02:00, UTC+2, UTC-03:00)
    const match = timezone.match(/UTC([+-]\d{1,2})(?::(\d{2}))?/);

    if (!match) {
      console.log("Invalid timezone format:", timezone);
      return null;
    }

    const hoursOffset = parseInt(match[1], 10);
    const minutesOffset = match[2] ? parseInt(match[2], 10) : 0;

    const totalOffsetMinutes =
      hoursOffset * 60 + (hoursOffset >= 0 ? minutesOffset : -minutesOffset);

    // Parse date & time
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Create local time
    const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Convert to UTC
    const utcDate = new Date(localDate.getTime() - totalOffsetMinutes * 60000);

    return {
      local: `${dateStr} ${timeStr}:00`,
      utc: utcDate.toISOString().replace("T", " ").substring(0, 19),
    };
  } catch (err) {
    console.log("Time conversion error:", err.message);
    return null;
  }
}

module.exports = {
  convertStageToUTC,
};
