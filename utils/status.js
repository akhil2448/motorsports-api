function getStatus({ start, end, now = new Date() }) {
  if (!start) return "upcoming";

  // future
  if (now < start) return "upcoming";

  // active session
  if (end && now >= start && now <= end) {
    return "live";
  }

  // past
  return "completed";
}

module.exports = {
  getStatus,
};

module.exports = {
  getStatus,
};
