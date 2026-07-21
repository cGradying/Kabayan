import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const result = await query(
    `SELECT ja.*, j.title AS job_title, j.budget_min, j.budget_max, j.status AS job_status,
            p.display_name, p.avatar_url
     FROM job_applications ja
     JOIN jobs j ON j.id = ja.job_id
     LEFT JOIN profiles p ON p.user_id = ja.applicant_id
     WHERE ja.applicant_id = $1
     ORDER BY ja.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
});

router.patch("/:id/status", authenticate, async (req, res) => {
  const { status } = req.body;
  if (!["pending", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const app = await query(
    `UPDATE job_applications SET status=$1, updated_at=now() WHERE id=$2
     AND job_id IN (SELECT id FROM jobs WHERE employer_id=$3)
     RETURNING *`,
    [status, req.params.id, req.userId]
  );
  if (app.rows.length === 0) return res.status(404).json({ error: "Application not found" });
  res.json(app.rows[0]);
});

export default router;
