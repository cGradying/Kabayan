import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const result = await query(
    `SELECT m.id, m.vendor_id, m.name, m.description, m.category, m.price,
            m.location_label, m.image_url, m.is_open, m.created_at, m.store_name,
            COALESCE(ROUND(AVG(vr.rating)::numeric, 1), 0) AS avg_rating,
            COUNT(vr.id)::bigint AS review_count
     FROM marketplace_listings m
     LEFT JOIN vendor_reviews vr ON vr.listing_id = m.id
     GROUP BY m.id ORDER BY m.created_at DESC`
  );
  res.json(result.rows);
});

router.post("/", authenticate, async (req, res) => {
  const { name, description, category, price, location_label, latitude, longitude, image_url, is_open, store_name } = req.body;
  const result = await query(
    `INSERT INTO marketplace_listings (vendor_id, name, description, category, price, location_label, latitude, longitude, image_url, is_open, store_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [req.userId, name, description, category, price, location_label, latitude, longitude, image_url, is_open ?? true, store_name || ""]
  );
  res.status(201).json({ id: result.rows[0].id });
});

router.put("/:id", authenticate, async (req, res) => {
  const listing = await query("SELECT vendor_id FROM marketplace_listings WHERE id = $1", [req.params.id]);
  if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  if (listing.rows[0].vendor_id !== req.userId) return res.status(403).json({ error: "Unauthorized" });

  const { name, description, category, price, location_label, latitude, longitude, image_url, is_open, store_name } = req.body;
  await query(
    `UPDATE marketplace_listings SET name=$1, description=$2, category=$3, price=$4,
     location_label=$5, latitude=$6, longitude=$7, image_url=$8, is_open=$9, store_name=$10, updated_at=now()
     WHERE id=$11`,
    [name, description, category, price, location_label, latitude, longitude, image_url, is_open, store_name, req.params.id]
  );
  res.json({ success: true });
});

router.patch("/:id/status", authenticate, async (req, res) => {
  const listing = await query("SELECT vendor_id FROM marketplace_listings WHERE id = $1", [req.params.id]);
  if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  if (listing.rows[0].vendor_id !== req.userId) return res.status(403).json({ error: "Unauthorized" });

  const { is_open } = req.body;
  await query("UPDATE marketplace_listings SET is_open=$1, updated_at=now() WHERE id=$2", [is_open, req.params.id]);
  res.json({ success: true });
});

router.delete("/:id", authenticate, async (req, res) => {
  const listing = await query("SELECT vendor_id FROM marketplace_listings WHERE id = $1", [req.params.id]);
  if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  if (listing.rows[0].vendor_id !== req.userId) return res.status(403).json({ error: "Unauthorized" });

  await query("DELETE FROM vendor_reviews WHERE listing_id = $1", [req.params.id]);
  await query("DELETE FROM marketplace_orders WHERE listing_id = $1", [req.params.id]);
  await query("DELETE FROM marketplace_listings WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

router.get("/:id/reviews", async (req, res) => {
  const result = await query(
    `SELECT vr.*, COALESCE(NULLIF(TRIM(p.display_name), ''), 'Community Member') AS reviewer_name, p.avatar_url AS reviewer_avatar_url
     FROM vendor_reviews vr
     LEFT JOIN profiles p ON p.user_id = vr.buyer_id
     WHERE vr.listing_id = $1
     ORDER BY vr.created_at DESC`,
    [req.params.id]
  );
  res.json(result.rows);
});

router.post("/:id/reviews", authenticate, async (req, res) => {
  const { rating, comment } = req.body;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });

  const listing = await query("SELECT vendor_id FROM marketplace_listings WHERE id = $1", [req.params.id]);
  if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  if (listing.rows[0].vendor_id === req.userId) return res.status(400).json({ error: "Cannot review your own listing" });

  const result = await query(
    "INSERT INTO vendor_reviews (listing_id, buyer_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING id",
    [req.params.id, req.userId, rating, comment]
  );
  res.status(201).json({ id: result.rows[0].id });
});

router.post("/:id/orders", authenticate, async (req, res) => {
  const { quantity, delivery_mode, delivery_address, notes } = req.body;

  const listing = await query("SELECT * FROM marketplace_listings WHERE id = $1", [req.params.id]);
  if (listing.rows.length === 0) return res.status(404).json({ error: "Listing not found" });
  const l = listing.rows[0];
  if (!l.is_open) return res.status(400).json({ error: "Item unavailable" });
  if (l.vendor_id === req.userId) return res.status(400).json({ error: "Cannot order your own listing" });

  const qty = Math.max(quantity ?? 1, 1);
  const mode = delivery_mode === "delivery" ? "delivery" : "pickup";
  if (mode === "delivery" && !delivery_address) return res.status(400).json({ error: "Delivery address required" });

  const result = await query(
    `INSERT INTO marketplace_orders (listing_id, vendor_id, buyer_id, quantity, delivery_mode, delivery_address, notes, total_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, status, total_amount, created_at`,
    [req.params.id, l.vendor_id, req.userId, qty, mode, delivery_address, notes, (l.price || 0) * qty]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
