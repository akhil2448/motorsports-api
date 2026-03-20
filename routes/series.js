/* ENDPOINTS

GET /series

*/

const express = require("express");
const router = express.Router();

const seriesService = require("../services/series-service");

router.get("/", async (req, res) => {
  try {
    const series = await seriesService.getAllSeries();

    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
