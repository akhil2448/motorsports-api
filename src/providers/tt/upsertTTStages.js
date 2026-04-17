const db = require("../../../db/pool");

async function upsertTTStages(eventId, stages) {
  // 🔥 full replace (safe for TT)
  await db.query(`DELETE FROM stages WHERE event_id = $1`, [eventId]);

  let order = 1;
  let inserted = 0;

  // 🔥 derive year
  const year = stages?.[0]?.start_time_utc
    ? new Date(stages[0].start_time_utc).getUTCFullYear()
    : new Date().getUTCFullYear();

  // 🔥 ALWAYS SORT (critical)
  const sortedStages = [...stages].sort(
    (a, b) => new Date(a.start_time_utc) - new Date(b.start_time_utc),
  );

  for (const s of sortedStages) {
    // ❌ safety filters
    if (!s?.start_time_utc || !s?.start_time_local) continue;
    if (/shakedown/i.test(s.name)) continue;

    if (!s.phase) {
      console.warn("Missing phase for TT stage:", s.name);
      continue;
    }

    const timezone = "UTC+01:00";

    // 🔥 stable external id
    const externalId = `tt_${year}_${s.phase}_${new Date(
      s.start_time_utc,
    ).getTime()}`;

    await db.query(
      `
      INSERT INTO stages (
        event_id,
        external_stage_id,
        stage_name,
        stage_number,
        start_time_utc,
        stage_order,
        start_time_local,
        event_timezone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        eventId,
        externalId,
        s.name,
        order,
        s.start_time_utc,
        order,
        s.start_time_local,
        timezone,
      ],
    );

    order++;
    inserted++;
  }

  return inserted;
}

module.exports = { upsertTTStages };
