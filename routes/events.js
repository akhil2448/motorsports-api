require("../src/config/env");
const express = require("express");
const router = express.Router();

const asyncHandler = require("../src/middleware/asyncHandler");

const eventsService = require("../services/events-service");
const unitsService = require("../services/units-service");

/* GET /events?year=2026 */

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const year = req.query.year;

    if (!year) {
      return res.status(400).json({
        error: "year query parameter required",
      });
    }

    const events = await eventsService.getEventsByYear(year);

    res.json(events);
  }),
);

/* GET /events/upcoming */

router.get(
  "/upcoming",
  asyncHandler(async (req, res) => {
    const events = await eventsService.getUpcomingEvents();
    res.json(events);
  }),
);

/* GET /events/series/:series */

router.get(
  "/series/:series",
  asyncHandler(async (req, res) => {
    const seriesShortName = req.params.series.toUpperCase();

    const events = await eventsService.getEventsBySeries(seriesShortName);

    res.json(events);
  }),
);

/* GET /events/:id */

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const eventId = req.params.id;

    const event = await eventsService.getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  }),
);

/* GET /events/:id/schedule */

router.get(
  "/:id/schedule",
  asyncHandler(async (req, res) => {
    const eventId = req.params.id;

    const schedule = await unitsService.getEventSchedule(eventId);

    res.json(schedule);
  }),
);

module.exports = router;
