const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db/pool");

/**
 * POST /users
 * Create anonymous user
 */
router.post("/", async (req, res) => {
  try {
    let user_id = req.body?.user_id;

    // ✅ If no user_id provided → generate one
    if (!user_id) {
      user_id = crypto.randomUUID();
    }

    await db.query(
      `
      INSERT INTO users (id)
      VALUES ($1)
      ON CONFLICT (id) DO NOTHING
      `,
      [user_id],
    );

    return res.json({ user_id });
  } catch (err) {
    console.error("Create user error:", err.message);
    return res.status(500).json({
      error: "Failed to create user",
    });
  }
});

module.exports = router;
