require("../src/config/env");
const express = require("express");
const router = express.Router();

const calendarService = require("../services/calendar-service");

/* GET /calendar */

router.get("/", async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;

    const calendar = await calendarService.getCalendar(days);

    res.json(calendar);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* GET /calendar/live */

router.get("/live", async (req, res) => {
  try {
    const live = await calendarService.getLiveCalendar();

    res.json(live);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
