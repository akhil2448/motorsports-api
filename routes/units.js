const express = require("express");
const router = express.Router();

const unitsService = require("../services/units-service");

/* GET /units/upcoming */

router.get("/upcoming", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const units = await unitsService.getUpcomingUnits(limit);

    res.json(units);
  } catch (err) {
    console.error("Error fetching upcoming units:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* GET /units/next */

router.get("/next", async (req, res) => {
  try {
    const unit = await unitsService.getNextUnit();

    if (!unit) {
      return res.json({ message: "No upcoming race units found" });
    }

    res.json(unit);
  } catch (err) {
    console.error("Error fetching next unit:", err);
    res.status(500).json({ error: "server error" });
  }
});

/* GET /units/live */

router.get("/live", async (req, res) => {
  try {
    const units = await unitsService.getLiveUnits();

    res.json(units);
  } catch (err) {
    console.error("Error fetching live units:", err);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
