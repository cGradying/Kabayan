import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

async function assertMember(roomId, userId) {
  const membership = await query(
    "SELECT 1 FROM conversation_reads WHERE room_id = $1 AND user_id = $2",
    [roomId, userId]
  );
  return membership.rows.length > 0;
}

router.get("/:roomId", authenticate, async (req, res) => {
  if (!(await assertMember(req.params.roomId, req.userId))) {
    return res.status(403).json({ error: "Not a participant" });
  }
  const result = await query(
    "SELECT id, room_id, sender_id, content, created_at FROM messages WHERE room_id = $1 ORDER BY created_at ASC",
    [req.params.roomId]
  );
  res.json(result.rows);
});

router.post("/", authenticate, async (req, res) => {
  const { room_id, content } = req.body;
  if (!(await assertMember(room_id, req.userId))) {
    return res.status(403).json({ error: "Not a participant" });
  }
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
