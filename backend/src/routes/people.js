import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/search", authenticate, async (req, res) => {
  const q = req.query.q || "";
  const result = await query(
    `SELECT user_id, display_name, avatar_url, job_role, location_label
     FROM profiles
     WHERE (display_name ILIKE $1 OR location_label ILIKE $1)
       AND user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_id = $2)
     ORDER BY display_name ASC LIMIT 20`,
    [`%${q}%`, req.userId]
  );
  res.json(result.rows);
});

export default router;
