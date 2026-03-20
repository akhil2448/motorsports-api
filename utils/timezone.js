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

function getUtcOffset(dateStr, country) {
  const normalizedCountry = country?.trim();

  const key = Object.keys(countryToTimezone).find(
    (k) => k.toLowerCase() === normalizedCountry?.toLowerCase(),
  );

  const tz = key ? countryToTimezone[key] : null;

  if (!tz) {
    console.warn("⚠️ Unknown timezone for country:", country);
    return "UTC+0";
  }

  try {
    const date = new Date(dateStr);

    const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const local = new Date(date.toLocaleString("en-US", { timeZone: tz }));

    const diff = (local - utc) / (1000 * 60 * 60);

    const sign = diff >= 0 ? "+" : "-";
    const abs = Math.abs(diff);

    return `UTC${sign}${abs}`;
  } catch (err) {
    console.warn("⚠️ Timezone calc failed:", err.message);
    return "UTC+0";
  }
}

// safe export
module.exports = getUtcOffset;
