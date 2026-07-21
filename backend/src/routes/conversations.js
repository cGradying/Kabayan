import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const result = await query(
    `SELECT DISTINCT ON (cr.room_id)
            cr.room_id AS "roomId",
            m.content AS "lastMsg",
            m.sender_id AS "lastSenderId",
            m.created_at AS "lastTime",
            CASE WHEN m.sender_id != $1 THEN m.sender_id
                 ELSE (SELECT sender_id FROM messages WHERE room_id = cr.room_id AND sender_id != $1 ORDER BY created_at DESC LIMIT 1)
            END AS "otherUserId"
     FROM conversation_reads cr
     LEFT JOIN LATERAL (
       SELECT content, sender_id, created_at FROM messages WHERE room_id = cr.room_id ORDER BY created_at DESC LIMIT 1
     ) m ON true
     WHERE cr.user_id = $1
     ORDER BY cr.room_id, m.created_at DESC NULLS LAST`,
    [req.userId]
  );
  res.json(result.rows);
});

router.post("/job", authenticate, async (req, res) => {
  const { job_id, employer_id } = req.body;
  const job = await query("SELECT employer_id FROM jobs WHERE id = $1", [job_id]);
  if (job.rows.length === 0) return res.status(404).json({ error: "Job not found" });
  if (job.rows[0].employer_id !== employer_id) return res.status(400).json({ error: "Employer mismatch" });
  if (req.userId === employer_id) return res.status(400).json({ error: "Cannot message yourself" });

  const parts = [req.userId, employer_id].sort();
  const roomId = `job:${job_id}:${parts[0]}:${parts[1]}`;

  await query(
    "INSERT INTO conversation_reads (room_id, user_id, last_read_at, updated_at) VALUES ($1,$2,now(),now()), ($1,$3,now(),now()) ON CONFLICT (room_id, user_id) DO UPDATE SET updated_at=now()",
    [roomId, req.userId, employer_id]
  );
  res.json({ room_id: roomId });
});

router.post("/direct", authenticate, async (req, res) => {
  const { other_user_id } = req.body;
  const parts = [req.userId, other_user_id].sort();
  const roomId = `direct:${parts[0]}:${parts[1]}`;

  await query(
    "INSERT INTO conversation_reads (room_id, user_id, last_read_at, updated_at) VALUES ($1,$2,now(),now()), ($1,$3,now(),now()) ON CONFLICT (room_id, user_id) DO UPDATE SET updated_at=now()",
    [roomId, req.userId, other_user_id]
  );
  res.json({ room_id: roomId });
});

export default router;
