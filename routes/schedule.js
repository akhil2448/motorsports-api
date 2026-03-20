const express = require("express");
const router = express.Router();

const scheduleService = require("../services/schedule-service");

/* GET /schedule/next */

router.get("/next", async (req, res) => {
  try {
    const item = await scheduleService.getNextScheduleItem();

    if (!item) {
      return res.json({ message: "No upcoming schedule items" });
    }

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* GET /schedule/live */

router.get("/live", async (req, res) => {
  try {
    const live = await scheduleService.getLiveSchedule();
    res.json(live);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* GET /schedule/today */

router.get("/today", async (req, res) => {
  try {
    const schedule = await scheduleService.getTodaySchedule();
    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

/* GET /schedule/week */

router.get("/week", async (req, res) => {
  try {
    const schedule = await scheduleService.getWeekSchedule();
    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
