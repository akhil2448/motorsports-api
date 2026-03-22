require("./src/config/env");

const express = require("express");
const cors = require("cors");

const eventsRoutes = require("./routes/events");
const seriesRoutes = require("./routes/series");
const calendarRoutes = require("./routes/calendar");
const unitsRoutes = require("./routes/units");
const scheduleRoutes = require("./routes/schedule");
const errorHandler = require("./src/middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Motorsport API running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/events", eventsRoutes);
app.use("/series", seriesRoutes);
app.use("/calendar", calendarRoutes);
app.use("/units", unitsRoutes);
app.use("/schedule", scheduleRoutes);

/* ✅ 404 HANDLER */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/* ✅ ERROR HANDLER (must be last) */
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
