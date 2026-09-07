#!/usr/bin/env node
// Loads a JSONL file produced by scripts/ingest.py, embeds each record's
// `content`, and upserts it into rag_documents. Reuses the backend's own
// db/llm modules instead of a separate Python DB driver — same DATABASE_URL,
// same NIM client, zero new dependencies.
//
// Usage: node backend/scripts/embed_load.mjs --in data/manila.jsonl [--batch 20]
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { query } from "../src/db.js";
import { embed, EMBED_MODEL_NAME } from "../src/llm.js";

const { values } = parseArgs({
  options: {
    in: { type: "string" },
    batch: { type: "string", default: "20" },
  },
});

if (!values.in) {
  console.error("Usage: node backend/scripts/embed_load.mjs --in data/manila.jsonl");
  process.exit(1);
}

const lines = readFileSync(values.in, "utf-8").split("\n").filter((l) => l.trim());
const records = lines.map((l) => JSON.parse(l));
const batchSize = Number(values.batch);

console.log(`Loading ${records.length} records from ${values.in}...`);

let loaded = 0;
for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, i + batchSize);
  const vectors = await embed(batch.map((r) => r.content), "passage");

  for (let j = 0; j < batch.length; j++) {
    const r = batch[j];
    await query(
      `INSERT INTO rag_documents
         (source, source_id, city, doc_type, name, store_name, category,
          price_text, price_min, price_max, location_label, latitude, longitude,
          url, content, metadata, embedding, embedding_model, verified, scraped_at)
       VALUES ($1,$2,$3,'vendor',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,false,$18)
       ON CONFLICT (source, source_id) DO UPDATE SET
         content = EXCLUDED.content, metadata = EXCLUDED.metadata,
         embedding = EXCLUDED.embedding, embedding_model = EXCLUDED.embedding_model,
         price_text = EXCLUDED.price_text, price_min = EXCLUDED.price_min, price_max = EXCLUDED.price_max,
         scraped_at = EXCLUDED.scraped_at`,
      [
        r.source, r.source_id, r.city, r.name, r.store_name, r.category,
        r.price_text, r.price_min, r.price_max, r.location_label, r.latitude, r.longitude,
        r.url, r.content, JSON.stringify(r.metadata ?? {}), vectors[j], EMBED_MODEL_NAME, r.scraped_at,
      ]
    );
    loaded++;
  }
  console.log(`  ${loaded}/${records.length}`);
}

console.log(`Done. ${loaded} rag_documents upserted with embedding_model=${EMBED_MODEL_NAME}.`);
process.exit(0);
