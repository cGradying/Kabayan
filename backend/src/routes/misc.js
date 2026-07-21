import { Router } from "express";
import { query } from "../db.js";
import { authenticate } from "../auth.js";

const router = Router();

router.get("/entities", async (req, res) => {
  const result = await query(
    `SELECT 'job' AS entity_type, j.id AS entity_id, j.title,
            'Job opening' AS subtitle, j.location_label, j.latitude, j.longitude,
            j.status = 'open' AS is_open, NULL::numeric AS price
     FROM jobs j WHERE j.latitude IS NOT NULL AND j.longitude IS NOT NULL
     UNION ALL
     SELECT 'listing' AS entity_type, m.id AS entity_id, m.name AS title,
            COALESCE(NULLIF(TRIM(m.store_name), ''), 'Unnamed Store') AS subtitle,
            m.location_label, m.latitude, m.longitude, m.is_open, m.price
     FROM marketplace_listings m WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL`
  );
  res.json(result.rows);
});

router.get("/jobs", authenticate, async (req, res) => {
  const result = await query("SELECT COUNT(*)::bigint AS count FROM jobs WHERE employer_id = $1", [req.userId]);
  res.json({ count: Number(result.rows[0].count) });
});

router.get("/listings", authenticate, async (req, res) => {
  const result = await query("SELECT COUNT(*)::bigint AS count FROM marketplace_listings WHERE vendor_id = $1", [req.userId]);
  res.json({ count: Number(result.rows[0].count) });
});

export default router;
