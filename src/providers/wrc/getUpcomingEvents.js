const pool = require("../../../db/pool");

// --- Config
const SERIES_ID = 2; // WRC
const WINDOW_DAYS = 14;

// --- MAIN FUNCTION
async function getUpcomingEvents() {
  const query = `
    SELECT
      id,
      series_id, 
      event_name,
      start_date,
      end_date,
      round_number,
      ewrc_event_id,
      country
    FROM events
    WHERE series_id = $1
      AND ewrc_event_id IS NOT NULL
      AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${WINDOW_DAYS} days'
    ORDER BY start_date ASC;
  `;

  const res = await pool.query(query, [SERIES_ID]);

  console.log(`📅 Found ${res.rows.length} upcoming WRC events`);

  return res.rows;
}

module.exports = getUpcomingEvents;
