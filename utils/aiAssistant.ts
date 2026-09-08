import { api } from "@/utils/api";

export type AssistantSource = {
  id: string;
  name: string;
  store_name: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number | string | null;
  source: string;
  verified: boolean;
};

export type AssistantAssessment = {
  situation: string;
  confidence: number;
  knows: string[];
  stage: "clarify" | "retrieve" | "recommend" | "act";
  next_step: string;
};

export type AssistantQueryResult = {
  conversation_id: string;
  reply: string;
  assessment: AssistantAssessment;
  sources: AssistantSource[];
};

export async function queryAssistant(message: string, conversationId?: string, signal?: AbortSignal): Promise<AssistantQueryResult> {
  return api.post<AssistantQueryResult>(
    "/api/assistant/query",
    {
      message,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    },
    signal
  );
}
