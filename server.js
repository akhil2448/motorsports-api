require("./src/config/env");

const express = require("express");
const cors = require("cors");

const eventsRoutes = require("./routes/events");
const seriesRoutes = require("./routes/series");
const calendarRoutes = require("./routes/calendar");
const unitsRoutes = require("./routes/units");
const scheduleRoutes = require("./routes/schedule");
const errorHandler = require("./src/middleware/errorHandler");
const internalRoutes = require("./routes/internal");
const notificationsRoute = require("./routes/notifications");
const usersRoute = require("./routes/users");
const userPreferencesRoute = require("./routes/userPreferences");
const cronRoutes = require("./routes/cron");
const pushRoutes = require("./routes/push");
const pushCronRoutes = require("./routes/pushCron");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://lightsout-notify.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.options("*", cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Motorsport API running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/ping", (req, res) => {
  res.status(200).end();
});

app.use("/events", eventsRoutes);
app.use("/series", seriesRoutes);
app.use("/calendar", calendarRoutes);
app.use("/units", unitsRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/internal", internalRoutes);
app.use("/notifications", notificationsRoute);
app.use("/users", usersRoute);
app.use("/user-preferences", userPreferencesRoute);
app.use("/api/cron", cronRoutes);
app.use("/push", pushRoutes);
app.use("/push-cron", pushCronRoutes);

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
