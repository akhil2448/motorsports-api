const scrapeTT = require("./scrapeTTSchedule");
const { normalizeTT } = require("./normalizeTT");
const { upsertTTEvent } = require("./upsertTTEvent");
const { upsertTTStages } = require("./upsertTTStages");

const db = require("../../../db/pool");
const { randomUUID } = require("crypto");

async function ingestTT() {
  try {
    // =========================
    // 1. SCRAPE + NORMALIZE
    // =========================
    const raw = await scrapeTT();
    const normalized = normalizeTT(raw);

    const year = new Date(normalized.eventStart).getUTCFullYear();
    const externalId = `tt_${year}`;

    // =========================
    // 2. GET EXISTING EVENT
    // =========================
    const existingRes = await db.query(
      `
      SELECT id, pdf_hash, series_id
      FROM events
      WHERE external_event_id = $1
      LIMIT 1
      `,
      [externalId],
    );

    const existingEvent = existingRes.rows[0] || null;

    const existingHash = existingEvent?.pdf_hash || null;

    const isFirstTime = !existingHash;
    const isChanged = existingHash !== normalized.hash;

    // =========================
    // 3. EARLY EXIT
    // =========================
    if (!isFirstTime && !isChanged) {
      console.log("No TT changes detected");
      return;
    }

    // =========================
    // 4. UPSERT EVENT (updates hash)
    // =========================
    const event = await upsertTTEvent(normalized);

    // =========================
    // 5. UPSERT STAGES
    // =========================
    const insertedCount = await upsertTTStages(event.id, normalized.stages);

    // =========================
    // 6. NOTIFICATIONS
    // =========================
    if (insertedCount > 0 || isChanged) {
      const usersRes = await db.query(
        `
        SELECT user_id
        FROM user_preferences
        WHERE $1 = ANY(followed_series)
        `,
        ["TT"],
      );

      const users = usersRes.rows;

      const type = isFirstTime ? "schedule_released" : "schedule_updated";

      const title = "TT";

      const eventName = normalized.eventName || "Isle of Man TT";

      const message = `${eventName} • ${
        isFirstTime ? "Schedule Released" : "Schedule Updated"
      }`;

      for (const user of users) {
        const dedupeKey = `${user.user_id}-tt_event_${event.id}_schedule_${normalized.hash}`;

        await db.query(
          `
          INSERT INTO notifications (
            id,
            user_id,
            series_id,
            event_id,
            type,
            title,
            message,
            data,
            dedupe_key
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (dedupe_key) DO NOTHING
          `,
          [
            randomUUID(),
            user.user_id,
            event.series_id,
            event.id,
            type,
            title,
            message,
            {
              stages_count: normalized.stages.length,
              updated_at: new Date().toISOString(),
            },
            dedupeKey,
          ],
        );
      }

      console.log(`🔔 TT notifications created for ${users.length} users`);
    }

    console.log("✅ TT ingestion complete");
  } catch (err) {
    console.error("TT ingestion failed:", err.message);
  }
}

module.exports = { ingestTT };

// 🔥 LOCAL TEST RUNNER
if (require.main === module) {
  ingestTT();
}
