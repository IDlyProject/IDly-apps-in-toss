const API_BASE_URL = import.meta.env.VITE_IDLY_API_BASE_URL ?? "http://localhost:3001";

export type ActionType = "tel" | "copy";
export type ActionStatus = "pending" | "done";
export type Confidence = "high" | "medium" | "low";
export type SafetyFlag = "refer_to_specialist" | null;

export interface BreachType {
  id: string;
  nameKr: string;
  goldenTime: "immediate" | "hours" | "flexible" | "registration";
  triggerKeywords: string[];
  requiresProviderSelection: boolean;
}

export interface ActionItem {
  id: string;
  breachTypeId: string;
  providerId: string | null;
  priority: number;
  title: string;
  description: string;
  actionType: ActionType;
  value: string;
}

export interface SpecialistReferral {
  title: string;
  description: string;
  actionType: ActionType;
  value: string;
}

export interface AnalyzeResult {
  detectedTypes: string[];
  confidence: Confidence;
  clarifyingQuestion: string | null;
  safetyFlag: SafetyFlag;
  actions: ActionItem[];
  specialistReferrals?: SpecialistReferral[];
  aiMessage: string;
  source: "local" | "upstage";
}

export interface UserActionLog {
  actionItemId: string;
  status: ActionStatus;
  createdAt: string;
  completedAt: string | null;
  action: ActionItem;
}

const sessionFetchOptions = {
  credentials: "include",
  headers: {
    "X-IDLY-Client": "web",
  },
} satisfies RequestInit;

export async function getBreachTypes(): Promise<BreachType[]> {
  const response = await fetch(`${API_BASE_URL}/breach-types`);
  return parseResponse(response);
}

export async function getMyActions(): Promise<UserActionLog[]> {
  const response = await fetch(`${API_BASE_URL}/me/actions`, sessionFetchOptions);
  return parseResponse(response);
}

export async function analyzeIncident(input: {
  text: string;
  image: File | null;
  selectedTypeId: string | null;
  consentToExternalAI: boolean;
}): Promise<AnalyzeResult> {
  const formData = new FormData();

  if (input.text.trim().length > 0) {
    formData.append("text", input.text.trim());
  }

  if (input.image != null) {
    formData.append("image", input.image);
  }

  if (input.selectedTypeId != null) {
    formData.append("selectedTypeId", input.selectedTypeId);
  }

  formData.append("consentToExternalAI", String(input.consentToExternalAI));

  const response = await fetch(`${API_BASE_URL}/chat/analyze`, {
    method: "POST",
    body: formData,
  });

  return parseResponse(response);
}

export async function setActionStatus(input: {
  actionId: string;
  status: ActionStatus;
}): Promise<UserActionLog> {
  const response = await fetch(`${API_BASE_URL}/actions/${input.actionId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IDLY-Client": "web",
    },
    credentials: "include",
    body: JSON.stringify({
      status: input.status,
    }),
  });

  return parseResponse(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload != null && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "요청을 처리하지 못했어요.";
    throw new Error(message);
  }

  return payload as T;
}
