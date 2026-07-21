import { GoogleGenerativeAI } from "@google/generative-ai";
import { api, getStoredUser } from "@/utils/api";

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  location_label: string;
  budget_min: number;
  budget_max: number;
  is_urgent: boolean;
  status: string;
  created_at: string;
};

type ListingRow = {
  id: string;
  store_name: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  location_label: string;
  is_open: boolean;
};

type AssistantContext = {
  jobs: JobRow[];
  listings: ListingRow[];
  userLocation: string | null;
};

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? "";

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export async function loadAssistantContext(): Promise<AssistantContext> {
  const [jobsData, listingsData, user] = await Promise.all([
    api.get<any[]>("/api/jobs").catch(() => []),
    api.get<any[]>("/api/marketplace").catch(() => []),
    getStoredUser(),
  ]);

  let userLocation: string | null = null;
  const userId = user?.id ?? null;
  if (userId) {
    try {
      const profile = await api.get<any>(`/api/profiles/${userId}/drawer`);
      userLocation = (profile as { location_label?: string | null } | null)?.location_label ?? null;
    } catch {
      // silently fail
    }
  }

  return {
    jobs: ((jobsData ?? []) as any[]).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      location_label: row.location_label,
      budget_min: toNumber(row.budget_min, 0),
      budget_max: toNumber(row.budget_max, 0),
      is_urgent: Boolean(row.is_urgent),
      status: row.status,
      created_at: row.created_at,
    })),
    listings: ((listingsData ?? []) as any[]).map((row) => ({
      id: row.id,
      store_name: row.store_name ?? "Unnamed Store",
      name: row.name,
      description: row.description ?? null,
      category: row.category,
      price: toNumber(row.price, 0),
      location_label: row.location_label,
      is_open: Boolean(row.is_open),
    })),
    userLocation,
  };
}

export async function getAssistantReply(message: string, context: AssistantContext): Promise<string> {
  if (GEMINI_KEY) {
    try {
      const ai = new GoogleGenerativeAI(GEMINI_KEY);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = buildPrompt(message, context);
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text) return text;
    } catch {
      // fall through to local answer generation
    }
  }

  return buildLocalReply(message, context);
}

function buildPrompt(message: string, context: AssistantContext) {
  const jobs = context.jobs
    .filter((job) => job.status === "open")
    .slice(0, 30)
    .map((job) => `- ${job.title} | ${job.location_label} | budget ${formatBudget(job.budget_min, job.budget_max)} | urgent: ${job.is_urgent ? "yes" : "no"}`)
    .join("\n");

  const listings = context.listings
    .filter((listing) => listing.is_open)
    .slice(0, 30)
    .map((listing) => `- ${listing.name} | store ${listing.store_name} | ${listing.category} | ${listing.location_label} | ₱${listing.price.toLocaleString()}`)
    .join("\n");

  return `
You are Kabayan AI, a concise assistant for jobs and store items.
Use only the provided database context. If the answer is not in the data, say so briefly.
User saved location: ${context.userLocation ?? "unknown"}.

Open jobs:
${jobs || "- none"}

Open store items:
${listings || "- none"}

User question: ${message}
`;
}

function buildLocalReply(message: string, context: AssistantContext) {
  const query = message.trim().toLowerCase();
  const locationQuery = query.includes("near me") ? (context.userLocation ?? "").toLowerCase() : query;

  const matchingJobs = context.jobs
    .filter((job) => job.status === "open")
    .filter((job) => matchesQuery(query, locationQuery, [job.title, job.description ?? "", job.location_label]))
    .slice(0, 4);

  const matchingListings = context.listings
    .filter((listing) => listing.is_open)
    .filter((listing) => matchesQuery(query, locationQuery, [listing.name, listing.store_name, listing.category, listing.description ?? "", listing.location_label]))
    .slice(0, 4);

  if (query.includes("job") && matchingJobs.length > 0) {
    return `I found ${matchingJobs.length} job${matchingJobs.length === 1 ? "" : "s"}: ${matchingJobs
      .map((job) => `${job.title} in ${job.location_label} (${formatBudget(job.budget_min, job.budget_max)})`)
      .join("; ")}.`;
  }

  if ((query.includes("food") || query.includes("store") || query.includes("market")) && matchingListings.length > 0) {
    return `I found ${matchingListings.length} store item${matchingListings.length === 1 ? "" : "s"}: ${matchingListings
      .map((listing) => `${listing.name} from ${listing.store_name} in ${listing.location_label} (₱${listing.price.toLocaleString()})`)
      .join("; ")}.`;
  }

  if (query.includes("near me") && context.userLocation) {
    const nearJobs = context.jobs.filter((job) => job.status === "open" && job.location_label.toLowerCase().includes(context.userLocation!.toLowerCase())).slice(0, 3);
    const nearListings = context.listings.filter((listing) => listing.is_open && listing.location_label.toLowerCase().includes(context.userLocation!.toLowerCase())).slice(0, 3);
    return `Near ${context.userLocation}, I found ${nearJobs.length} open jobs and ${nearListings.length} open store items.${nearJobs[0] ? ` Top job: ${nearJobs[0].title}.` : ""}${nearListings[0] ? ` Top store item: ${nearListings[0].name} from ${nearListings[0].store_name}.` : ""}`;
  }

  if (matchingJobs.length || matchingListings.length) {
    const parts: string[] = [];
    if (matchingJobs.length) parts.push(`${matchingJobs.length} matching job${matchingJobs.length === 1 ? "" : "s"}`);
    if (matchingListings.length) parts.push(`${matchingListings.length} matching store item${matchingListings.length === 1 ? "" : "s"}`);
    return `I found ${parts.join(" and ")}. Ask me for “jobs near me”, “food near me”, or a category/store name for a tighter answer.`;
  }

  return "I can help with open jobs, store items, and what is near your saved location. Try asking “jobs near me”, “street food near me”, or “show urgent jobs”.";
}

function matchesQuery(query: string, locationQuery: string, haystacks: string[]) {
  if (!query) return true;
  const normalized = haystacks.join(" ").toLowerCase();
  if (query.includes("near me")) {
    return locationQuery ? normalized.includes(locationQuery) : true;
  }
  return normalized.includes(query);
}

function formatBudget(min: number, max: number) {
  if (min > 0 && max > 0 && min !== max) return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
  if (max > 0) return `₱${max.toLocaleString()}`;
  if (min > 0) return `₱${min.toLocaleString()}`;
  return "budget on request";
}
