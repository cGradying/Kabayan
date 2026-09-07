// Ladderized decision loop: deterministic "what's the next step" logic over
// a conversation's accumulated state. No LLM calls in here — that's the point,
// this is the part that must never guess.

// "off_topic" = scope guard: the message isn't about jobs/food/marketplace
// in Metro Manila — the AI redirects instead of answering it, so a
// conversation about the app can't wander into general chit-chat or
// unrelated Q&A.
export const INTENTS = ["food", "hire", "job", "vendor_info", "off_topic", "unknown"];
export const STAGES = ["clarify", "retrieve", "recommend", "act"];

// slots required before an intent can move past "clarify"
const REQUIRED = {
  food: ["category", "location"],
  hire: ["category", "location"],
  job: ["category", "location"], // either one satisfies (see missingSlots)
  vendor_info: ["name"],
  off_topic: [],
  unknown: [],
};

export function emptyState() {
  return {
    intent: "unknown",
    slots: {},
    evidence: [],
    stage: "clarify",
    confidence: 0,
    shown: [],
  };
}

// Merge an extractor turn into existing state. Known slots are never
// overwritten with null/empty — the AI should only add to what it knows.
export function mergeTurn(state, turn) {
  const next = {
    ...state,
    slots: { ...state.slots },
    evidence: [...state.evidence],
    shown: [...state.shown],
  };

  if (turn.intent && turn.intent !== "unknown") next.intent = turn.intent;
  if (typeof turn.confidence === "number") next.confidence = turn.confidence;

  for (const [key, value] of Object.entries(turn.slots || {})) {
    if (value === null || value === undefined || value === "") continue;
    next.slots[key] = value;
  }

  if (turn.evidence) next.evidence.push(turn.evidence);

  return next;
}

function missingSlots(state) {
  const required = REQUIRED[state.intent] ?? [];
  if (state.intent === "job") {
    // job intent: category OR location is enough, not both
    const hasEither = required.some((key) => state.slots[key]);
    return hasEither ? [] : required;
  }
  return required.filter((key) => !state.slots[key]);
}

// The ladder: stop at the first rung that holds.
export function nextStage(state, { resultCount = null, userPickedId = null } = {}) {
  if (state.intent === "unknown" || state.intent === "off_topic") return "clarify";

  const missing = missingSlots(state);
  if (missing.length > 0) return "clarify";

  if (userPickedId) return "act";

  if (resultCount === null) return "retrieve";
  if (resultCount === 0) return "clarify"; // widen and ask again
  return "recommend";
}

// The single highest-value missing slot to ask about — never a list.
export function nextQuestion(state) {
  if (state.intent === "unknown") return "intent";
  const missing = missingSlots(state);
  return missing[0] ?? null;
}

export function markShown(state, docIds) {
  const seen = new Set(state.shown);
  for (const id of docIds) seen.add(id);
  return { ...state, shown: [...seen] };
}
