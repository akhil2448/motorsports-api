const pool = require("../../../db/pool");

// --- Config
const WINDOW_DAYS = 14;

// --- MAIN FUNCTION
async function getUpcomingEvents() {
  const query = `
  SELECT
    e.id,
    e.series_id,
    e.event_name,
    e.start_date,
    e.end_date,
    e.round_number,
    e.ewrc_event_id,
    e.country
  FROM events e
  JOIN series s ON e.series_id = s.id
  WHERE s.short_name = 'WRC'
    AND e.ewrc_event_id IS NOT NULL
    AND e.start_date BETWEEN CURRENT_DATE - INTERVAL '1 day'
                        AND CURRENT_DATE + INTERVAL '${WINDOW_DAYS} days'
  ORDER BY e.start_date ASC;
`;

  const res = await pool.query(query);

  console.log(`📅 Found ${res.rows.length} upcoming WRC events`);

  return res.rows;
}

module.exports = getUpcomingEvents;
