const countryToTimezone = {
  Croatia: "Europe/Zagreb",
  Kenya: "Africa/Nairobi",
  Sweden: "Europe/Stockholm",
  Monaco: "Europe/Monaco",
  Portugal: "Europe/Lisbon",
  Japan: "Asia/Tokyo",
  Greece: "Europe/Athens",
  Estonia: "Europe/Tallinn",
  Finland: "Europe/Helsinki",
  Paraguay: "America/Asuncion",
  Chile: "America/Santiago",
  Italy: "Europe/Rome",
  "Saudi Arabia": "Asia/Riyadh",
};

/* ---------------------------------- */
/* FORMAT OFFSET → UTC+HH:MM          */
/* ---------------------------------- */

function formatOffset(diff) {
  const sign = diff >= 0 ? "+" : "-";
  const abs = Math.abs(diff);

  const hours = String(Math.floor(abs)).padStart(2, "0");
  const minutes = String(Math.round((abs % 1) * 60)).padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
}

/* ---------------------------------- */
/* GET OFFSET FROM COUNTRY + DATE     */
/* ---------------------------------- */

function getUtcOffset(dateStr, country) {
  const normalizedCountry = country?.trim();

  const key = Object.keys(countryToTimezone).find(
    (k) => k.toLowerCase() === normalizedCountry?.toLowerCase(),
  );

  const tz = key ? countryToTimezone[key] : null;

  if (!tz) {
    console.warn("⚠️ Unknown timezone for country:", country);
    return "UTC+00:00";
  }

  try {
    const date = new Date(dateStr);

    const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const local = new Date(date.toLocaleString("en-US", { timeZone: tz }));

    const diff = (local - utc) / (1000 * 60 * 60);

    return formatOffset(diff); // ✅ FIXED FORMAT
  } catch (err) {
    console.warn("⚠️ Timezone calc failed:", err.message);
    return "UTC+00:00";
  }
}

module.exports = getUtcOffset;
