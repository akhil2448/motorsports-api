require("../../src/config/env");
const pool = require("../../db/pool");

async function ensureSeries(shortName, name) {
  const res = await pool.query(`SELECT id FROM series WHERE short_name = $1`, [
    shortName,
  ]);

  if (res.rows.length > 0) {
    return res.rows[0].id;
  }

  const insert = await pool.query(
    `
    INSERT INTO series (name, short_name)
    VALUES ($1,$2)
    RETURNING id
    `,
    [name, shortName],
  );

  console.log(`Created series: ${name}`);

  return insert.rows[0].id;
}

async function insertEvent(seriesId, event) {
  const res = await pool.query(
    `
    INSERT INTO events
    (series_id, event_name, location, country, start_date, end_date, round_number, external_event_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (series_id, external_event_id) DO UPDATE
    SET
      event_name = EXCLUDED.event_name,
      location = EXCLUDED.location,
      country = EXCLUDED.country,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      round_number = EXCLUDED.round_number
    RETURNING id
    `,
    [
      seriesId,
      event.name,
      event.location,
      event.country,
      event.start_date,
      event.end_date,
      event.round,
      event.external_id,
    ],
  );

  return res.rows[0].id;
}

async function insertUnit(eventId, unit) {
  if (unit.type === "session") {
    await pool.query(
      `
    INSERT INTO sessions
    (
      event_id,
      external_session_id,
      session_name,
      session_type,
      start_time_utc,
      end_time_utc,
      start_time_local,
      end_time_local,
      event_timezone,
      session_order
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (event_id, external_session_id)
    DO UPDATE SET
      session_name = EXCLUDED.session_name,
      session_type = EXCLUDED.session_type,
      start_time_utc = EXCLUDED.start_time_utc,
      end_time_utc = EXCLUDED.end_time_utc,
      start_time_local = EXCLUDED.start_time_local,
      end_time_local = EXCLUDED.end_time_local,
      event_timezone = EXCLUDED.event_timezone,
      session_order = EXCLUDED.session_order
    `,
      [
        eventId,
        unit.external_id,
        unit.name,
        unit.session_type,
        unit.start_time,
        unit.end_time,
        unit.start_time_local,
        unit.end_time_local,
        unit.event_timezone,
        unit.order,
      ],
    );
  }

  if (unit.type === "stage") {
    await pool.query(
      `
    INSERT INTO stages
    (
      event_id,
      external_stage_id,
      stage_name,
      stage_number,
      start_time_utc,
      start_time_local,
      event_timezone,
      distance_km,
      stage_order
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (event_id, external_stage_id)
    DO UPDATE SET
      stage_name = EXCLUDED.stage_name,
      stage_number = EXCLUDED.stage_number,
      start_time_utc = EXCLUDED.start_time_utc,
      start_time_local = EXCLUDED.start_time_local,
      event_timezone = EXCLUDED.event_timezone,
      distance_km = EXCLUDED.distance_km,
      stage_order = EXCLUDED.stage_order
    `,
      [
        eventId,
        unit.external_id,
        unit.name,
        unit.stage_number,
        unit.start_time, // UTC
        unit.start_time_local, // NEW
        unit.event_timezone, // NEW
        unit.distance,
        unit.order,
      ],
    );
  }
}

async function ingestSeries(data) {
  const seriesId = await ensureSeries(data.series.short_name, data.series.name);

  for (const event of data.events) {
    await pool.query("BEGIN");

    try {
      const eventId = await insertEvent(seriesId, event);

      for (const unit of event.units) {
        await insertUnit(eventId, unit);
      }

      await pool.query("COMMIT");

      console.log(`Imported event: ${event.name}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`Failed importing event: ${event.name}`);
      throw err;
    }
  }
}

module.exports = {
  ingestSeries,
};
