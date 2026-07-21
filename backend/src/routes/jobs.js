import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const result = await query(
    `SELECT id, title, description, location_label, budget_min, budget_max,
            is_urgent, status, created_at
     FROM jobs ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

router.get("/:id", async (req, res) => {
  const result = await query(
    `SELECT id, employer_id, title, description, location_label, budget_min, budget_max,
            is_urgent, status, created_at
     FROM jobs WHERE id = $1 LIMIT 1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Job not found" });
  res.json(result.rows[0]);
});

router.post("/", authenticate, async (req, res) => {
  const {
    title, description, requirements, budget_min, budget_max,
    location_label, latitude, longitude, is_urgent, status,
  } = req.body;
  const result = await query(
    `INSERT INTO jobs (employer_id, title, description, requirements, budget_min, budget_max,
                       location_label, latitude, longitude, is_urgent, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, title, description, location_label, budget_min, budget_max, is_urgent, status, created_at`,
    [req.userId, title, description, requirements || [], budget_min, budget_max,
     location_label, latitude, longitude, is_urgent ?? false, status ?? "open"]
  );
  res.status(201).json(result.rows[0]);
});

router.put("/:id", authenticate, async (req, res) => {
  const job = await query("SELECT employer_id FROM jobs WHERE id = $1", [req.params.id]);
  if (job.rows.length === 0) return res.status(404).json({ error: "Job not found" });
  if (job.rows[0].employer_id !== req.userId) return res.status(403).json({ error: "Unauthorized" });

  const { title, description, requirements, budget_min, budget_max, location_label, latitude, longitude, is_urgent } = req.body;
  const result = await query(
    `UPDATE jobs SET title=$1, description=$2, requirements=$3, budget_min=$4, budget_max=$5,
                     location_label=$6, latitude=$7, longitude=$8, is_urgent=$9, updated_at=now()
     WHERE id=$10 RETURNING *`,
    [title, description, requirements, budget_min, budget_max, location_label, latitude, longitude, is_urgent, req.params.id]
  );
  res.json(result.rows[0]);
});

router.patch("/:id/status", authenticate, async (req, res) => {
  const job = await query("SELECT employer_id FROM jobs WHERE id = $1", [req.params.id]);
  if (job.rows.length === 0) return res.status(404).json({ error: "Job not found" });
  if (job.rows[0].employer_id !== req.userId) return res.status(403).json({ error: "Unauthorized" });

  const { status } = z.object({ status: z.enum(["open", "closed"]) }).parse(req.body);
  await query("UPDATE jobs SET status=$1, updated_at=now() WHERE id=$2", [status, req.params.id]);
  res.json({ success: true });
});

router.get("/:id/applicants", authenticate, async (req, res) => {
  const job = await query("SELECT employer_id FROM jobs WHERE id = $1", [req.params.id]);
  if (job.rows.length === 0) return res.status(404).json({ error: "Job not found" });

  const result = await query(
    `SELECT ja.id, ja.job_id, ja.applicant_id, ja.cover_letter, ja.expected_rate,
            ja.resume_uri, ja.availability_note, ja.status, ja.created_at,
            p.display_name, p.avatar_url, p.job_role, p.location_label
     FROM job_applications ja
     JOIN profiles p ON p.user_id = ja.applicant_id
     WHERE ja.job_id = $1
     ORDER BY ja.created_at DESC`,
    [req.params.id]
  );
  res.json(result.rows);
});

router.post("/:id/apply", authenticate, async (req, res) => {
  const { cover_letter, expected_rate, resume_uri, answers, availability_note } = req.body;

  const owner = await query("SELECT employer_id FROM jobs WHERE id = $1", [req.params.id]);
  if (owner.rows.length === 0) return res.status(404).json({ error: "Job not found" });
  if (owner.rows[0].employer_id === req.userId) return res.status(400).json({ error: "Cannot apply to own job" });

  const existing = await query("SELECT id FROM job_applications WHERE job_id=$1 AND applicant_id=$2", [req.params.id, req.userId]);
  if (existing.rows.length > 0) return res.status(409).json({ error: "Already applied" });

  const result = await query(
    `INSERT INTO job_applications (job_id, applicant_id, cover_letter, expected_rate, resume_uri, answers, availability_note)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [req.params.id, req.userId, cover_letter, expected_rate, resume_uri, answers ?? {}, availability_note]
  );
  res.status(201).json({ id: result.rows[0].id });
});

export default router;
