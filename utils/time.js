/* ---------------------------------- */
/* CONVERT LOCAL TIME → UTC           */
/* ---------------------------------- */

function convertStageToUTC(dateStr, timeStr, timezone) {
  try {
    if (!dateStr || !timeStr || !timezone) {
      console.log("Missing inputs:", dateStr, timeStr, timezone);
      return null;
    }

    // Extract offset (UTC+2 → 2)
    const offsetMatch = timezone.match(/UTC([+-]\d+)/);
    const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;

    // Split time
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Create UTC date directly
    const utcDate = new Date(
      Date.UTC(
        ...dateStr.split("-").map(Number), // year, month, day
      ),
    );

    // Adjust month index (JS months 0-based)
    utcDate.setUTCFullYear(
      Number(dateStr.split("-")[0]),
      Number(dateStr.split("-")[1]) - 1,
      Number(dateStr.split("-")[2]),
    );

    // Set UTC time by subtracting offset
    utcDate.setUTCHours(hours - offset, minutes, 0, 0);

    return {
      local: `${dateStr} ${timeStr}:00`,
      utc: utcDate.toISOString(),
    };
  } catch (err) {
    console.log("Time conversion error:", err.message);
    return null;
  }
}

module.exports = {
  convertStageToUTC,
};
