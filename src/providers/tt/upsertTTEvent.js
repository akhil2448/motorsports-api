const db = require("../../../db/pool");

async function upsertTTEvent({ eventStart, eventEnd, hash }) {
  // 🔥 dynamic year (from event start)
  const year = new Date(eventStart).getUTCFullYear();
  const externalId = `tt_${year}`;
  const slug = `iomtt-${year}`;

  // 🔥 get TT series_id
  const seriesRes = await db.query(
    `SELECT id FROM series WHERE short_name = 'TT' LIMIT 1`,
  );

  const seriesId = seriesRes.rows[0].id;

  const res = await db.query(
    `
    INSERT INTO events (
      series_id,
      event_name,
      location,
      country,
      start_date,
      end_date,
      round_number,
      external_event_id,
      slug,
      pdf_hash
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (external_event_id)
    DO UPDATE SET
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      pdf_hash = EXCLUDED.pdf_hash
    RETURNING id, pdf_hash, series_id, external_event_id
    `,
    [
      seriesId,
      "Isle of Man TT",
      "Isle of Man",
      "UK",
      eventStart,
      eventEnd,
      1,
      externalId,
      slug,
      hash,
    ],
  );

  return res.rows[0];
}

module.exports = { upsertTTEvent };
