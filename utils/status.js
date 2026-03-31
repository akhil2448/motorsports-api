// function getStatus({ start, end, now = new Date() }) {
//   if (!start) return "upcoming";

//   const startTime = new Date(start);
//   const endTime = end ? new Date(end) : null;

//   if (startTime > now) return "upcoming";

//   if (endTime && startTime <= now && endTime >= now) {
//     return "live";
//   }

//   return "completed";
// }

// function getStatus({ start, end, now = new Date() }) {
//   // 🔍 DEBUG CHECK
//   if (start && !(start instanceof Date)) {
//     console.warn("❌ start is NOT Date:", start);
//   }

//   if (end && !(end instanceof Date)) {
//     console.warn("❌ end is NOT Date:", end);
//   }

//   if (start && start instanceof Date && isNaN(start)) {
//     console.warn("❌ start is INVALID Date:", start);
//   }

//   if (end && end instanceof Date && isNaN(end)) {
//     console.warn("❌ end is INVALID Date:", end);
//   }

//   if (!start) return "upcoming";

//   const startTime = new Date(start);
//   const endTime = end ? new Date(end) : null;

//   if (startTime > now) return "upcoming";

//   if (endTime && startTime <= now && endTime >= now) {
//     return "live";
//   }

//   return "completed";
// }
function getStatus({ start, end, now = new Date() }) {
  if (!start) return "upcoming";

  if (start > now) return "upcoming";

  if (end && start <= now && end >= now) {
    return "live";
  }

  return "completed";
}

module.exports = {
  getStatus,
};

module.exports = {
  getStatus,
};
