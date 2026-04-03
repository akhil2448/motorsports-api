const express = require("express");
const router = express.Router();
const db = require("../db/pool");

/**
 * POST /users
 * Create anonymous user
 */
router.post("/", async (req, res) => {
  try {
    const result = await db.query(
      `
      INSERT INTO users DEFAULT VALUES
      RETURNING id
      `,
    );

    return res.json({
      user_id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Create user error:", err.message);
    return res.status(500).json({
      error: "Failed to create user",
    });
  }
});

module.exports = router;
