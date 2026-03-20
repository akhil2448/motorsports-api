const pool = require("../../../db/pool");

/* ---------------------------------- */
/* SAVE SLUG TO EVENT                 */
/* ---------------------------------- */

async function saveSlugToEvent(slug, startDate) {
  const date = new Date(startDate).toISOString().split("T")[0];

  const result = await pool.query(
    `
    UPDATE events
    SET slug = $1
    WHERE series_id = (
        SELECT id FROM series WHERE short_name = 'WRC'
    )
    AND start_date BETWEEN $2::date - INTERVAL '3 days'
                        AND $2::date + INTERVAL '3 days'
    AND slug IS NULL
    RETURNING id, event_name
    `,
    [slug, date],
  );

  if (result.rowCount > 0) {
    console.log(`Saved slug ${slug} → ${result.rows[0].event_name}`);
  }
}

/* ---------------------------------- */
/* MAP MULTIPLE EVENTS                */
/* ---------------------------------- */

async function mapSlugsToEvents(calendarEvents) {
  for (const event of calendarEvents) {
    await saveSlugToEvent(event.slug, event.start_date);
  }
}

module.exports = {
  mapSlugsToEvents,
};
