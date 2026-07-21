import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/:userId", async (req, res) => {
  const result = await query(
    `SELECT user_id, display_name, avatar_url, job_role, id_verification_status, location_label, created_at
     FROM profiles WHERE user_id = $1 LIMIT 1`,
    [req.params.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Profile not found" });
  res.json(result.rows[0]);
});

router.get("/:userId/drawer", authenticate, async (req, res) => {
  const result = await query(
    `SELECT user_id, display_name, avatar_url, id_verification_status, job_role, market_role, location_label
     FROM profiles WHERE user_id = $1 LIMIT 1`,
    [req.params.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Profile not found" });
  res.json(result.rows[0]);
});

router.put("/:userId", authenticate, async (req, res) => {
  if (req.params.userId !== req.userId) return res.status(403).json({ error: "Unauthorized" });
  const { display_name, avatar_url, bio, location_label, job_role, market_role } = req.body;
  const result = await query(
    `INSERT INTO profiles (user_id, display_name, avatar_url, bio, location_label, job_role, market_role, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT (user_id) DO UPDATE SET display_name=COALESCE($2,profiles.display_name),
       avatar_url=COALESCE($3,profiles.avatar_url), bio=COALESCE($4,profiles.bio),
       location_label=COALESCE($5,profiles.location_label), job_role=COALESCE($6,profiles.job_role),
       market_role=COALESCE($7,profiles.market_role), updated_at=now()
     RETURNING *`,
    [req.userId, display_name, avatar_url, bio, location_label, job_role, market_role]
  );
  res.json(result.rows[0]);
});

router.post("/:userId/verify", authenticate, async (req, res) => {
  if (req.params.userId !== req.userId) return res.status(403).json({ error: "Unauthorized" });
  const { id_photo_uri, resume_uri, birth_date } = req.body;
  await query(
    `UPDATE profiles SET id_photo_uri=$1, resume_uri=$2, birth_date=$3,
     id_verification_status='pending_review', verification_submitted_at=now(), updated_at=now()
     WHERE user_id=$4`,
    [id_photo_uri, resume_uri, birth_date, req.userId]
  );
  res.json({ success: true });
});

export default router;
