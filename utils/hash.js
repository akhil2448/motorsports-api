const crypto = require("crypto");

function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex");
}

module.exports = { hashContent };
