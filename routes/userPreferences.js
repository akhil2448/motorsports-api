const express = require("express");
const router = express.Router();
const db = require("../db/pool");

async function ensureUserExists(userId) {
  await db.query(
    `
    INSERT INTO users (id)
    VALUES ($1)
    ON CONFLICT (id) DO NOTHING
    `,
    [userId],
  );
}

/**
 * GET /user-preferences/:userId
 * Fetch user preferences
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await ensureUserExists(userId);

    let result = await db.query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId],
    );

    // ✅ if not found → create default
    if (result.rows.length === 0) {
      const insert = await db.query(
        `
        INSERT INTO user_preferences (
          user_id,
          followed_series,
          notify_before_minutes,
          notify_event_start
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [userId, [], 10, true],
      );

      return res.json(insert.rows[0]);
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch preferences error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /user-preferences
 * Create or update preferences (UPSERT)
 */
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      followed_series,
      notify_before_minutes,
      notify_event_start,
    } = req.body;

    await ensureUserExists(user_id);

    const result = await db.query(
      `
      INSERT INTO user_preferences (
        user_id,
        followed_series,
        notify_before_minutes,
        notify_event_start
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        followed_series = EXCLUDED.followed_series,
        notify_before_minutes = EXCLUDED.notify_before_minutes,
        notify_event_start = EXCLUDED.notify_event_start,
        updated_at = now()
      RETURNING *
      `,
      [user_id, followed_series, notify_before_minutes, notify_event_start],
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Update preferences error:", err.message);
    return res.status(500).json({
      error: "Failed to update preferences",
    });
  }
});

module.exports = router;
