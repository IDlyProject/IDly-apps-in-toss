export type GoldenTime = "immediate" | "hours" | "flexible" | "registration";

export type ProviderCategory =
  | "card"
  | "bank"
  | "telecom"
  | "exchange"
  | "government"
  | "platform"
  | "credit_bureau";

export type ActionType = "tel" | "copy";

export type ActionStatus = "pending" | "done";

export type Confidence = "high" | "medium" | "low";

export type SafetyFlag = "refer_to_specialist" | null;

export interface BreachType {
  id: string;
  nameKr: string;
  goldenTime: GoldenTime;
  triggerKeywords: string[];
  requiresProviderSelection: boolean;
}

export interface Provider {
  id: string;
  breachTypeId: string;
  name: string;
  aliases: string[];
  category: ProviderCategory;
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

export interface AnalyzeRequest {
  text?: string;
  selectedTypeId?: string;
  consentToExternalAI?: boolean;
}

export interface AnalyzeResult {
  detectedTypes: string[];
  confidence: Confidence;
  clarifyingQuestion: string | null;
  safetyFlag: SafetyFlag;
  aiMessage: string;
  actions: ActionItem[];
  specialistReferrals?: SpecialistReferral[];
  source: "local" | "upstage";
}

export interface ModelAnalyzeResult {
  detected_types: string[];
  confidence: Confidence;
  clarifying_question: string | null;
  safety_flag: SafetyFlag;
  actions: Array<{ action_item_id: string }>;
  ai_message: string;
}

export interface UserResponseLog {
  actionItemId: string;
  status: ActionStatus;
  createdAt: string;
  completedAt: string | null;
}
