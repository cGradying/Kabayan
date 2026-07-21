import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/:roomId", authenticate, async (req, res) => {
  const result = await query(
    "SELECT id, room_id, sender_id, content, created_at FROM messages WHERE room_id = $1 ORDER BY created_at ASC",
    [req.params.roomId]
  );
  res.json(result.rows);
});

router.post("/", authenticate, async (req, res) => {
  const { room_id, content } = req.body;
  const result = await query(
    "INSERT INTO messages (room_id, sender_id, content) VALUES ($1,$2,$3) RETURNING id",
    [room_id, req.userId, content]
  );
  await query(
    "INSERT INTO conversation_reads (room_id, user_id, last_read_at, updated_at) VALUES ($1,$2,now(),now()) ON CONFLICT (room_id, user_id) DO UPDATE SET updated_at = now()",
    [room_id, req.userId]
  );
  res.status(201).json({ id: result.rows[0].id });
});

export default router;
