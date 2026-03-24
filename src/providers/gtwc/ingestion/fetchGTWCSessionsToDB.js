const { fetchGTWCSessions } = require("../fetchGTWCSessions");
const db = require("../../../../db/pool");

async function upsertGTWCSessions(event) {
  try {
    const sessionData = await fetchGTWCSessions({
      ...event,
      source_url: `https://www.gt-world-challenge-europe.com/event/${event.slug}`,
    });

    const { sessions, hash } = sessionData;

    // 🔍 Get existing hash
    const res = await db.query(
      `SELECT id, pdf_hash FROM events WHERE id = $1`,
      [event.id],
    );

    if (!res.rows.length) return;

    const existingHash = res.rows[0].pdf_hash;

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
          start_time_local,
          end_time_utc,
          end_time_local,
          session_order,
          external_session_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          event.id,
          session.name,
          session.type,
          session.start_time,
          session.local_start_time,
          null,
          null,
          order++,
          `${event.slug}_${session.name}_${session.start_time}`,
        ],
      );
    }

    // 🔄 Update hash
    await db.query(`UPDATE events SET pdf_hash = $1 WHERE id = $2`, [
      hash,
      event.id,
    ]);

    console.log(`Updated ${sessions.length} sessions`);
  } catch (err) {
    console.error("Session ingestion error:", err.message);
  }
}

module.exports = { upsertGTWCSessions };
