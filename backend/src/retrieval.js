import { query } from "./db.js";
import { embed, EMBED_MODEL_NAME } from "./llm.js";

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ponytail: full scan + JS cosine, see schema.sql note on rag_documents.
// Fine at one city's worth of vendors; upgrade to pgvector <=> when it isn't.
export async function searchRagDocuments(queryText, { city = null, limit = 8 } = {}) {
  const [queryVector] = await embed([queryText], "query");

  const params = [EMBED_MODEL_NAME];
  let where = "embedding_model = $1 AND embedding IS NOT NULL";
  if (city) {
    params.push(city);
    where += ` AND city = $${params.length}`;
  }

  const { rows } = await query(
    `SELECT id, source, city, name, store_name, category, price_text, price_min, price_max,
            location_label, latitude, longitude, url, content, verified, embedding
     FROM rag_documents WHERE ${where}`,
    params
  );

  return rows
    .map((row) => ({ ...row, score: cosineSimilarity(queryVector, row.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ embedding, ...rest }) => rest);
}

// Hybrid: exact-ish SQL filters over the same table, for names/prices vector
// search is bad at. Union with the vector hits in the caller, live verified
// rows (jobs/marketplace_listings, queried separately) outrank both.
export async function filterRagDocuments({ city = null, category = null, maxPrice = null, limit = 8 } = {}) {
  const params = [];
  const clauses = [];
  if (city) { params.push(city); clauses.push(`city = $${params.length}`); }
  if (category) { params.push(`%${category}%`); clauses.push(`category ILIKE $${params.length}`); }
  if (maxPrice) { params.push(maxPrice); clauses.push(`(price_max IS NULL OR price_max <= $${params.length})`); }

  const where = clauses.length ? clauses.join(" AND ") : "true";
  const { rows } = await query(
    `SELECT id, source, city, name, store_name, category, price_text, price_min, price_max,
            location_label, latitude, longitude, url, content, verified
     FROM rag_documents WHERE ${where} ORDER BY created_at DESC LIMIT ${Number(limit)}`,
    params
  );
  return rows;
}
