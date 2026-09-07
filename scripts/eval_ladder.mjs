#!/usr/bin/env node
// Replays scripted multi-turn conversations against a running backend and
// prints the ladder state after each turn. Not a unit test (backend/src/ladder.test.mjs
// covers the pure logic) — this is a human-readable check that the real
// NIM-backed extractor+responder loop actually climbs the ladder correctly.
//
// Usage: (backend running on localhost:4000, a signed-up test user)
//   node scripts/eval_ladder.mjs --token <jwt>
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { token: { type: "string" }, url: { type: "string", default: "http://localhost:4000" } } });
if (!values.token) {
  console.error("Usage: node scripts/eval_ladder.mjs --token <jwt>  (sign up/in first to get one)");
  process.exit(1);
}

const CONVERSATIONS = [
  ["gusto ko ng murang lugaw sa Manila", "sige, Sampaloc na lang"],
  ["I need a tubero to fix a leaking pipe", "budget ko is 500 pesos, Quezon City"],
  ["may trabaho ba para sa akin", "carpenter ako, taga Antipolo"],
  ["ano meron sa Aling Nena's Lugawan"],
];

async function turn(conversationId, message) {
  const res = await fetch(`${values.url}/api/assistant/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${values.token}` },
    body: JSON.stringify({ message, ...(conversationId ? { conversation_id: conversationId } : {}) }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

for (const [i, script] of CONVERSATIONS.entries()) {
  console.log(`\n=== conversation ${i + 1} ===`);
  let conversationId;
  for (const message of script) {
    const result = await turn(conversationId, message);
    conversationId = result.conversation_id;
    console.log(`> ${message}`);
    console.log(`< [${result.assessment.stage}, ${Math.round(result.assessment.confidence * 100)}%] ${result.reply}`);
    console.log(`  knows: ${JSON.stringify(result.assessment.knows)}`);
    console.log(`  sources: ${result.sources.length}`);
  }
}
