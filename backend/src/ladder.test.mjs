import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, mergeTurn, nextStage, nextQuestion, markShown } from "./ladder.js";

test("empty state clarifies on intent", () => {
  const state = emptyState();
  assert.equal(nextStage(state), "clarify");
  assert.equal(nextQuestion(state), "intent");
});

test("food intent with only category still clarifies (location missing)", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw" } });
  assert.equal(nextStage(state), "clarify");
  assert.equal(nextQuestion(state), "location");
});

test("food intent with category + location moves to retrieve", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw", location: "Sampaloc" } });
  assert.equal(nextStage(state), "retrieve");
  assert.equal(nextQuestion(state), null);
});

test("retrieve with zero results falls back to clarify (widen)", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw", location: "Sampaloc" } });
  assert.equal(nextStage(state, { resultCount: 0 }), "clarify");
});

test("retrieve with results moves to recommend", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw", location: "Sampaloc" } });
  assert.equal(nextStage(state, { resultCount: 3 }), "recommend");
});

test("a picked result moves to act regardless of resultCount", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw", location: "Sampaloc" } });
  assert.equal(nextStage(state, { resultCount: 3, userPickedId: "doc-1" }), "act");
});

test("job intent needs category OR location, not both", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "job", slots: { category: "tubero" } });
  assert.equal(nextStage(state), "retrieve");
});

test("known slots are never dropped by a later turn that omits them", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw" } });
  state = mergeTurn(state, { slots: { location: "Sampaloc" } });
  assert.equal(state.slots.category, "lugaw");
  assert.equal(state.slots.location, "Sampaloc");
  assert.equal(nextStage(state), "retrieve");
});

test("off_topic intent always clarifies, never retrieves, even mid-conversation", () => {
  let state = emptyState();
  state = mergeTurn(state, { intent: "food", slots: { category: "lugaw", location: "Sampaloc" } });
  state = mergeTurn(state, { intent: "off_topic" });
  assert.equal(nextStage(state), "clarify");
  // existing slots survive the off-topic aside
  assert.equal(state.slots.category, "lugaw");
});

test("shown[] accumulates and dedupes", () => {
  let state = emptyState();
  state = markShown(state, ["a", "b"]);
  state = markShown(state, ["b", "c"]);
  assert.deepEqual([...state.shown].sort(), ["a", "b", "c"]);
});
