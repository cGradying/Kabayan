const BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const CHAT_MODEL = process.env.NIM_CHAT_MODEL || "openai/gpt-oss-20b";
const EMBED_MODEL = process.env.NIM_EMBED_MODEL || "nvidia/nemotron-3-embed-1b";

function apiKey() {
  const key = process.env.NVIDIA_NIM_API_KEY?.trim();
  if (!key) throw new Error("NVIDIA_NIM_API_KEY is not set");
  return key;
}

async function post(path, body) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const payload = await res.json().catch(() => null);
    lastError = new Error(`NIM ${path} failed: ${res.status} ${JSON.stringify(payload)}`);
    if (res.status < 500) throw lastError; // 4xx won't fix itself on retry
  }
  throw lastError;
}

// gpt-oss-20b spends completion tokens on hidden reasoning before the visible
// answer — low reasoning effort + a generous token budget, or content comes
// back empty with finish_reason "length".
export async function chat(messages, { json = false, temperature = 0.2, maxTokens = 500 } = {}) {
  const payload = await post("/chat/completions", {
    model: CHAT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    chat_template_kwargs: { reasoning_effort: "low" },
    ...(json ? { response_format: { type: "json_object" } } : {}),
  });
  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("NIM chat returned empty content");
  return content;
}

// inputType: "passage" when indexing documents, "query" at retrieval time —
// NIM's embed models rank differently depending on which side you're on.
export async function embed(texts, inputType) {
  if (!inputType) throw new Error("embed() requires inputType: 'passage' | 'query'");
  const payload = await post("/embeddings", {
    model: EMBED_MODEL,
    input: texts,
    input_type: inputType,
    encoding_format: "float",
  });
  return payload.data.map((row) => row.embedding);
}

export const EMBED_MODEL_NAME = EMBED_MODEL;
