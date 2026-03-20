const pool = require("../db/pool");

async function getNextScheduleItem() {
  const result = await pool.query(`
    SELECT *
    FROM units_view
    WHERE start_time > NOW()
    ORDER BY start_time
    LIMIT 1
  `);

  return result.rows[0];
}

async function getLiveSchedule() {
  const result = await pool.query(`
    SELECT *
    FROM units_view
    WHERE start_time <= NOW()
    AND end_time >= NOW()
    ORDER BY start_time
  `);

  return result.rows;
}

async function getTodaySchedule() {
  const result = await pool.query(`
    SELECT *
    FROM units_view
    WHERE start_time >= date_trunc('day', NOW())
    AND start_time < date_trunc('day', NOW()) + INTERVAL '1 day'
    ORDER BY start_time
  `);

  return result.rows;
}

async function getWeekSchedule() {
  const result = await pool.query(`
    SELECT *
    FROM units_view
    WHERE start_time >= NOW()
    AND start_time <= NOW() + INTERVAL '7 days'
    ORDER BY start_time
  `);

  return result.rows;
}

module.exports = {
  getNextScheduleItem,
  getLiveSchedule,
  getTodaySchedule,
  getWeekSchedule,
};
