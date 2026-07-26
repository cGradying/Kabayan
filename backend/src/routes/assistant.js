import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { query } from "../db.js";

const router = Router();
const NIM_URL = process.env.NIM_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL = process.env.NIM_MODEL || "meta/llama-3.3-70b-instruct";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
});

router.post("/query", authenticate, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please enter a shorter question." });

  const apiKey = process.env.NVIDIA_NIM_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: "NVIDIA NIM is not configured on the server." });
  }

  try {
    const [jobsResult, listingsResult, profileResult] = await Promise.all([
      query(
        `SELECT title, description, location_label, budget_min, budget_max, is_urgent
         FROM jobs WHERE status = 'open' ORDER BY is_urgent DESC, created_at DESC LIMIT 30`
      ),
      query(
        `SELECT name, store_name, description, category, price, location_label
         FROM marketplace_listings WHERE is_open = true ORDER BY created_at DESC LIMIT 30`
      ),
      query("SELECT location_label FROM profiles WHERE user_id = $1 LIMIT 1", [req.userId]),
    ]);

    const completion = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        temperature: 0.25,
        max_tokens: 320,
        stream: false,
        messages: [
          { role: "system", content: buildSystemPrompt(jobsResult.rows, listingsResult.rows, profileResult.rows[0]?.location_label) },
          { role: "user", content: parsed.data.message },
        ],
      }),
    });

    const payload = await completion.json().catch(() => null);
    if (!completion.ok) {
      console.error("NIM request failed", completion.status, payload);
      return res.status(502).json({ error: "Kabayan AI is taking a short break. Please try again." });
    }

    const reply = payload?.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: "Kabayan AI could not form a response. Please try again." });

    res.json({ reply, model: NIM_MODEL });
  } catch (error) {
    console.error("Assistant query failed", error);
    res.status(500).json({ error: "Kabayan AI could not answer right now." });
  }
});

function buildSystemPrompt(jobs, listings, userLocation) {
  const formatMoney = (value) => `₱${Number(value || 0).toLocaleString()}`;
  const jobsText = jobs.length
    ? jobs.map((job) => `- ${job.title} | ${job.location_label} | ${formatMoney(job.budget_min)}–${formatMoney(job.budget_max)} | urgent: ${job.is_urgent ? "yes" : "no"}`).join("\n")
    : "- No open jobs.";
  const listingsText = listings.length
    ? listings.map((listing) => `- ${listing.name} | ${listing.store_name || "Unnamed Store"} | ${listing.category} | ${listing.location_label} | ${formatMoney(listing.price)}`).join("\n")
    : "- No open marketplace listings.";

  return `You are Kabayan AI, a friendly and practical community guide for jobs and local marketplace listings in the Philippines.
Reply in concise, easy-to-scan plain text. Use Philippine pesos. You may answer in English, Filipino, or Taglish to match the user. Never invent jobs, prices, availability, locations, or contact details. If the answer is not in the context, say so and offer a useful next question.
Saved location: ${userLocation || "not set"}

Open jobs:
${jobsText}

Open marketplace listings:
${listingsText}`;
}

export default router;
