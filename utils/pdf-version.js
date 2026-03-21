const crypto = require("crypto");

/* ---------------------------------- */
/* EXTRACT FILENAME FROM URL          */
/* ---------------------------------- */

function getPdfFilename(url) {
  if (!url) return null;

  return url.split("/").pop().toLowerCase();
}

/* ---------------------------------- */
/* HASH PDF IDENTITY                  */
/* ---------------------------------- */

function getPdfHash(url) {
  const filename = getPdfFilename(url);

  if (!filename) return null;

  return crypto.createHash("md5").update(url).digest("hex");
}

module.exports = {
  getPdfFilename,
  getPdfHash,
};
