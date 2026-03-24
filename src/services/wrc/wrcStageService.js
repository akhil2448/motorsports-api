require("../../../src/config/env");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const pool = require("../../../db/pool");
const { randomUUID } = require("crypto");

const { parseWrcPdf } = require("./wrcPdfParser");
const { convertStageToUTC } = require("../../../utils/time");
const getUtcOffset = require("../../../utils/timezone");

const { getPdfHash } = require("../../../utils/pdf-version");
const { findPdfUrl } = require("./wrcPdfService");

/* ---------------------------------- */
/* NOTIFICATION HELPER                */
/* ---------------------------------- */

async function createNotification(payload) {
  const { seriesId, eventId, type, title, message, data, dedupeKey } = payload;

  const query = `
    INSERT INTO notifications (
      id, series_id, event_id, type, title, message, data, dedupe_key
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (dedupe_key) DO NOTHING
  `;

  await pool.query(query, [
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

/* ---------------------------------- */
/* GET UPCOMING EVENT                 */
/* ---------------------------------- */

async function getUpcomingEvent() {
  const res = await pool.query(`
    SELECT id, event_name, slug, start_date, country, pdf_hash, external_event_id, series_id
    FROM events
    WHERE series_id = (SELECT id FROM series WHERE short_name = 'WRC')
    AND start_date >= NOW()
    ORDER BY start_date ASC
    LIMIT 1
  `);

  return res.rows[0];
}

/* ---------------------------------- */
/* DOWNLOAD PDF                       */
/* ---------------------------------- */

async function downloadPdf(url, filePath) {
  const writer = fs.createWriteStream(filePath);

  const res = await axios({
    url,
    method: "GET",
    responseType: "stream",
    timeout: 20000,
  });

  res.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

/* ---------------------------------- */
/* INSERT STAGES                      */
/* ---------------------------------- */

async function insertStages(event, stages) {
  let order = 1;

  for (const stage of stages) {
    const timezone = getUtcOffset(stage.stage_date, event.country);

    const times = convertStageToUTC(
      stage.stage_date,
      stage.time_local,
      timezone,
    );

    await pool.query(
      `
      INSERT INTO stages
      (event_id, external_stage_id, stage_name, stage_number,
       start_time_local, start_time_utc, event_timezone,
       distance_km, stage_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (event_id, external_stage_id)
      DO UPDATE SET
        stage_name = EXCLUDED.stage_name,
        stage_number = EXCLUDED.stage_number,
        start_time_local = EXCLUDED.start_time_local,
        start_time_utc = EXCLUDED.start_time_utc,
        event_timezone = EXCLUDED.event_timezone,
        distance_km = EXCLUDED.distance_km,
        stage_order = EXCLUDED.stage_order
      `,
      [
        event.id,
        stage.stage_number,
        stage.name,
        stage.stage_number,
        times?.local || null,
        times?.utc || null,
        timezone,
        stage.distance_km,
        order++,
      ],
    );
  }
}

/* ---------------------------------- */
/* MAIN INGESTION FLOW                */
/* ---------------------------------- */

async function ingestLatestPdfStages() {
  const event = await getUpcomingEvent();

  if (!event) {
    console.log("No upcoming event found");
    return;
  }

  console.log("=================================");
  console.log("Processing:", event.event_name);

  const pdfUrl = await findPdfUrl(event.slug, event.external_event_id);

  if (!pdfUrl) {
    console.log("No PDF found → skipping");
    return;
  }

  console.log("PDF URL:", pdfUrl);

  const pdfHash = getPdfHash(pdfUrl);

  console.log("PDF Hash:", pdfHash);

  if (event.pdf_hash === pdfHash) {
    console.log("No change in PDF → skipping ingestion");
    return;
  }

  console.log("PDF changed → proceeding with ingestion");

  const filePath = path.join(
    __dirname,
    `../../../pdfs/${event.slug.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`,
  );

  try {
    console.log("Downloading PDF...");
    await downloadPdf(pdfUrl, filePath);

    const stages = await parseWrcPdf(filePath);

    console.log(`Parsed ${stages.length} stages`);

    if (!stages.length) {
      console.log("No stages parsed → aborting");
      return;
    }

    console.log("Starting DB transaction...");
    await pool.query("BEGIN");

    console.log("Clearing old stages...");
    await pool.query(`DELETE FROM stages WHERE event_id = $1`, [event.id]);

    await insertStages(event, stages);

    await pool.query(`UPDATE events SET pdf_hash = $1 WHERE id = $2`, [
      pdfHash,
      event.id,
    ]);

    await pool.query("COMMIT");

    console.log("✅ Transaction committed");
    console.log("Stages inserted successfully");

    // =========================
    // 🔔 CREATE NOTIFICATION
    // =========================
    await createNotification({
      seriesId: event.series_id,
      eventId: event.id,
      type: "event_updated",

      title: "WRC Schedule Updated",
      message: `${event.event_name} stages have been updated`,

      data: {
        old_hash: event.pdf_hash,
        new_hash: pdfHash,
        stages_count: stages.length,
      },

      dedupeKey: `wrc_event_${event.id}_hash_${pdfHash}`,
    });

    console.log(`Notification created for ${event.event_name}`);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Error:", err.message);
  }
}

module.exports = {
  ingestLatestPdfStages,
};
