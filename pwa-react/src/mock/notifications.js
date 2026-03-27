// src/mock/notifications.js
export const mockNotifications = [
  {
    id: "1",
    series: "WRC",
    title: "WRC Schedule Updated",
    message: "Croatia Rally stages have been updated",
    type: "event_updated",
    created_at: "2026-03-24T22:30:00Z",
    isRead: false,
  },
  {
    id: "2",
    series: "IndyCar",
    title: "Schedule Released",
    message: "Indianapolis full schedule is now available",
    type: "schedule_released",
    created_at: "2026-03-24T20:10:00Z",
    isRead: false,
  },
  {
    id: "3",
    series: "GTWC",
    title: "Schedule Updated",
    message: "Brands Hatch schedule updated",
    type: "event_updated",
    created_at: "2026-03-23T18:00:00Z",
    isRead: true,
  },

  {
    id: "4",
    series: "DTM",
    title: "DTM Schedule Updated",
    message: "Spa Schedule released",
    type: "event_updated",
    created_at: "2026-03-26T22:10:00Z",
    isRead: false,
  },
];
