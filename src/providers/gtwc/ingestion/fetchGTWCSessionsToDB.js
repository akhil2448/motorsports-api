const { fetchGTWCSessions } = require("../fetchGTWCSessions");
const db = require("../../../../db/pool");
const { randomUUID } = require("crypto");

async function createNotification(payload) {
  const { seriesId, eventId, type, title, message, data, dedupeKey } = payload;

  const query = `
    INSERT INTO notifications (
      id, series_id, event_id, type, title, message, data, dedupe_key
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (dedupe_key) DO NOTHING
  `;

  await db.query(query, [
    randomUUID(),
    seriesId,
    eventId,
    type,
    title,
    message,
    data,
    dedupeKey,
  ]);
}

async function upsertGTWCSessions(event) {
  try {
    const sessionData = await fetchGTWCSessions({
      ...event,
      source_url: `https://www.gt-world-challenge-europe.com/event/${event.slug}`,
    });

    const { sessions, hash } = sessionData;

    // 🔍 Get existing hash
    const res = await db.query(
      `SELECT id, pdf_hash, series_id FROM events WHERE id = $1`,
      [event.id],
    );

    if (!res.rows.length) return;

    const existingHash = res.rows[0].pdf_hash;
    const seriesId = res.rows[0].series_id;

    // ✅ Skip if no change
    if (existingHash === hash) {
      console.log(`No change for ${event.event_name}`);
      return;
    }

    console.log(`Updating sessions for ${event.event_name}`);

    // 🧹 Delete old sessions
    await db.query(`DELETE FROM sessions WHERE event_id = $1`, [event.id]);

    // ➕ Insert new sessions
    let order = 1;

    for (const session of sessions) {
      await db.query(
        `
        INSERT INTO sessions (
  event_id,
  session_name,
  session_type,
  start_time_utc,
  end_time_utc,
  session_order,
  external_session_id,
  start_time_local,
  end_time_local,
  event_timezone
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `,
        [
          event.id,
          session.name,
          session.type,
          session.start_time_utc,
          null,
          order++,
          `${event.slug}_${session.name}_${session.start_time_utc?.toISOString?.() || session.start_time_utc}`,
          session.start_time_local,
          null,
          session.event_timezone,
        ],
      );
    }

    // 🔄 Update hash
    await db.query(`UPDATE events SET pdf_hash = $1 WHERE id = $2`, [
      hash,
      event.id,
    ]);

    console.log(`Updated ${sessions.length} sessions`);

    // =========================
    // 🔔 CREATE NOTIFICATION
    // =========================
    await createNotification({
      seriesId,
      eventId: event.id,
      type: "event_updated",

      title: "GTWC Schedule Updated",
      message: `${event.event_name} schedule has been updated`,

      data: {
        old_hash: existingHash,
        new_hash: hash,
        sessions_count: sessions.length,
      },

      dedupeKey: `gtwc_event_${event.id}_hash_${hash}`,
    });

    console.log(`Notification created for ${event.event_name}`);
  } catch (err) {
    console.error("Session ingestion error:", err.message);
  }
}

module.exports = { upsertGTWCSessions };
