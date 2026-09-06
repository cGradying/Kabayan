import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { signToken, authenticate } from "../auth.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const u = await query(
    "INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid()::text, $1, $2) RETURNING id",
    [email, hash]
  );
  const userId = u.rows[0].id;
  await query(
    "INSERT INTO profiles (user_id, display_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
    [userId, displayName || email.split("@")[0]]
  );
  const token = signToken(userId);
  res.status(201).json({ token, user: { id: userId, email } });
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const u = await query("SELECT id, password_hash FROM users WHERE email = $1", [email]);
  if (u.rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

  if (!u.rows[0].password_hash) return res.status(401).json({ error: "Invalid email or password" });

  const match = await bcrypt.compare(password, u.rows[0].password_hash);
  if (!match) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(u.rows[0].id);
  res.json({ token, user: { id: u.rows[0].id, email } });
});

router.get("/me", authenticate, async (req, res) => {
  const u = await query("SELECT id, email, created_at FROM users WHERE id = $1", [req.userId]);
  if (u.rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json(u.rows[0]);
});

export default router;
