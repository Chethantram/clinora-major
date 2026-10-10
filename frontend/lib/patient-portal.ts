import { fetchApi } from "@/lib/backend-api";

export const DEFAULT_PATIENT_ID = "P001";

export async function agentQuery(
  prompt: string,
  patientId = DEFAULT_PATIENT_ID,
  options?: {
    allPatients?: boolean;
    apiKey?: string;
    model?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
) {
  const isAllPatients = options?.allPatients === true;
  const body: Record<string, unknown> = {
    prompt,
    allPatients: isAllPatients,
    history: options?.history || [],
  } as any;

  if (!isAllPatients && patientId) {
    body.patientId = patientId;
  }
  if (options?.apiKey) body.apiKey = options.apiKey;
  if (options?.model) body.model = options.model;

  let api: { answer?: string; response?: string; error?: string };
  try {
    api = await fetchApi<{ answer?: string; response?: string; error?: string }>("/api/assistant/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (e) {
    api = { error: e instanceof Error ? e.message : "Backend unavailable" };
  }

  if (api.answer) return api.answer;
  if (api.response) return api.response;
  if (api.error) return `Backend error: ${api.error}`;
  return "No response returned from backend.";
}
