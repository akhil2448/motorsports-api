const axios = require("axios");
const pool = require("../../../db/pool");
const { DateTime } = require("luxon");
const crypto = require("crypto");
const { randomUUID } = require("crypto");

const getUpcomingEvents = require("./getUpcomingEvents");

// --- Fetch timetable
async function fetchTimetable(ewrc_event_id) {
  const url = `https://api-next.ewrc-results.com/event/${ewrc_event_id}/timetable`;
  const res = await axios.get(url);
  return res.data;
}

// --- Create Notification
async function createNotificationsForUsers(payload) {
  const { seriesId, eventId, type, title, message, data, dedupeKey } = payload;

  const usersRes = await pool.query(
    `
    SELECT user_id
    FROM user_preferences
    WHERE $1 = ANY(followed_series)
    `,
    ["WRC"],
  );

  for (const user of usersRes.rows) {
    const userDedupeKey = `${user.user_id}-${dedupeKey}`;

    await pool.query(
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
        seriesId,
        eventId,
        type,
        title,
        message,
        data,
        userDedupeKey,
      ],
    );
  }
}

// --- Convert time
function convertTime(localTime, timezone) {
  const dt = DateTime.fromSQL(localTime, { zone: timezone });

  return {
    utc: dt.toUTC().toISO(),
    local: dt.toSQL({ includeOffset: false }),
    offset: `UTC${dt.toFormat("ZZ")}`,
  };
}

// --- Generate deterministic hash
function generateStagesHash(stages) {
  const normalized = stages
    .map((s) => ({
      stage_number: s.stage_number,
      time: s.start_time_local,
      distance: s.distance_km,
      cancelled: s.is_stage_cancelled,
      powerstage: s.is_powerstage,
    }))
    .sort((a, b) => a.stage_number - b.stage_number);

  return crypto
    .createHash("md5")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

// --- UPSERT stage
async function upsertStage(stageData) {
  const query = `
    INSERT INTO stages (
      event_id,
      external_stage_id,
      stage_name,
      stage_number,
      start_time_utc,
      distance_km,
      stage_order,
      start_time_local,
      event_timezone,
      is_powerstage,
      is_stage_cancelled
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (event_id, external_stage_id)
    DO UPDATE SET
      stage_name = EXCLUDED.stage_name,
      stage_number = EXCLUDED.stage_number,
      start_time_utc = EXCLUDED.start_time_utc,
      distance_km = EXCLUDED.distance_km,
      stage_order = EXCLUDED.stage_order,
      start_time_local = EXCLUDED.start_time_local,
      event_timezone = EXCLUDED.event_timezone,
      is_powerstage = EXCLUDED.is_powerstage,
      is_stage_cancelled = EXCLUDED.is_stage_cancelled
  `;

  await pool.query(query, [
    stageData.event_id,
    stageData.external_stage_id,
    stageData.stage_name,
    stageData.stage_number,
    stageData.start_time_utc,
    stageData.distance_km,
    stageData.stage_order,
    stageData.start_time_local,
    stageData.event_timezone,
    stageData.is_powerstage,
    stageData.is_stage_cancelled,
  ]);
}

// --- MAIN FUNCTION
async function fetchWrcStages() {
  console.log("🏁 Syncing stages...");

  const events = await getUpcomingEvents();

  for (const event of events) {
    try {
      // --- get timezone + existing hash
      const { rows } = await pool.query(
        `SELECT timezone, pdf_hash FROM events WHERE id = $1`,
        [event.id],
      );

      const timezone = rows[0]?.timezone;
      const existingHash = rows[0]?.pdf_hash;

      const isNew = !existingHash;

      if (!timezone) {
        console.warn(`⚠️ No timezone for event ${event.event_name}`);
        continue;
      }

      const timetable = await fetchTimetable(event.ewrc_event_id);
      const stages = timetable.stages || [];

      const stageList = [];

      for (const item of stages) {
        const s = item.stage;

        if (!s || !s.first_car_time) continue;

        const time = convertTime(s.first_car_time, timezone);

        stageList.push({
          event_id: event.id,
          external_stage_id: String(s.id),
          stage_name: s.name,
          stage_number: s.stage_number,
          start_time_utc: time.utc,
          distance_km: s.distance,
          stage_order: s.stage_number,
          start_time_local: time.local,
          event_timezone: time.offset,
          is_powerstage: s.powerstage === 1,
          is_stage_cancelled: s.cancelled === 1,
        });
      }

      // --- generate hash
      const newHash = generateStagesHash(stageList);

      // --- compare hash
      if (existingHash && existingHash === newHash) {
        console.log(`⏭️ No changes: ${event.event_name}`);
        continue;
      }

      // --- insert/update stages
      for (const stageData of stageList) {
        await upsertStage(stageData);
      }

      // --- update hash
      await pool.query(`UPDATE events SET pdf_hash = $1 WHERE id = $2`, [
        newHash,
        event.id,
      ]);

      // =========================
      // 🔔 CREATE NOTIFICATION
      // =========================
      await createNotificationsForUsers({
        seriesId: event.series_id,
        eventId: event.id,
        type: isNew ? "schedule_released" : "schedule_updated",
        title: "WRC",
        message: `${event.event_name} • ${
          isNew ? "Schedule Released" : "Schedule Updated"
        }`,
        data: {
          stages_count: stageList.length,
        },
        dedupeKey: `wrc_event_${event.id}_${newHash}`,
      });

      console.log(`🔔 Notification created: ${event.event_name}`);
    } catch (err) {
      console.error(`❌ Failed for event ${event.event_name}`, err.message);
    }
  }

  console.log("✅ Stage sync complete");
}

module.exports = fetchWrcStages;
