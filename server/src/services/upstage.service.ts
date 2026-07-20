import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ActionItem, ModelAnalyzeResult } from "../../domain/types.js";
import { actionItems, breachTypes, providers } from "../../domain/seed.js";

interface AnalyzeWithUpstageInput {
  text: string;
  selectedTypeId?: string;
  image?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  };
}

@Injectable()
export class UpstageService {
  constructor(private readonly config: ConfigService) {}

  shouldUseLiveCalls(): boolean {
    const enabled = this.config.get<string>("UPSTAGE_ENABLE_LIVE_CALLS", "false") === "true";
    const hasKey = Boolean(this.config.get<string>("UPSTAGE_API_KEY"));
    return enabled && hasKey;
  }

  async analyzeWithUpstage(input: AnalyzeWithUpstageInput): Promise<ModelAnalyzeResult> {
    const apiKey = this.config.get<string>("UPSTAGE_API_KEY");
    const liveCallsEnabled = this.config.get<string>("UPSTAGE_ENABLE_LIVE_CALLS", "false") === "true";

    if (!liveCallsEnabled || apiKey == null || apiKey.length === 0) {
      throw new ServiceUnavailableException("Upstage live calls are disabled.");
    }

    const extractedText = input.image == null ? "" : await this.parseDocument(input.image, apiKey);
    const modelResult = await this.callSolar({
      apiKey,
      userMessage: input.text,
      extractedText,
      selectedTypeId: input.selectedTypeId,
    });

    return this.refineModelResult(modelResult, `${input.text}\n${extractedText}`);
  }

  private async parseDocument(
    image: NonNullable<AnalyzeWithUpstageInput["image"]>,
    apiKey: string,
  ): Promise<string> {
    const endpoint = this.config.get<string>(
      "UPSTAGE_DOCUMENT_PARSE_URL",
      "https://api.upstage.ai/v1/document-digitization",
    );

    const formData = new FormData();
    formData.append("model", "document-parse");
    formData.append("output_formats", JSON.stringify(["text"]));
    formData.append(
      "document",
      new Blob([image.buffer], { type: image.mimetype }),
      image.originalname,
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Document Parse failed: ${response.status}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    return this.extractTextFromDocumentParse(payload);
  }

  private async callSolar(input: {
    apiKey: string;
    userMessage: string;
    extractedText: string;
    selectedTypeId?: string;
  }): Promise<ModelAnalyzeResult> {
    const endpoint = this.config.get<string>(
      "UPSTAGE_SOLAR_CHAT_URL",
      "https://api.upstage.ai/v1/chat/completions",
    );
    const model = this.config.get<string>("UPSTAGE_SOLAR_MODEL", "solar-pro3");
    const candidates = this.getCandidateContext(input.userMessage, input.extractedText, input.selectedTypeId);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: this.systemPrompt(),
          },
          {
            role: "user",
            content: JSON.stringify({
              dp_extracted_text: input.extractedText,
              user_message: input.userMessage,
              candidate_breach_types: candidates.types,
              candidate_providers_by_type: candidates.providersByType,
              candidate_actions_by_type: candidates.actionsByType,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "idly_breach_response",
            strict: true,
            schema: this.responseSchema(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Solar failed: ${response.status}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (content == null) {
      throw new ServiceUnavailableException("Solar response did not include content.");
    }

    return JSON.parse(content) as ModelAnalyzeResult;
  }

  private extractTextFromDocumentParse(payload: Record<string, unknown>): string {
    if (typeof payload.text === "string") {
      return payload.text;
    }

    if (typeof payload.content === "string") {
      return payload.content;
    }

    const pages = payload.pages;
    if (Array.isArray(pages)) {
      return pages
        .map((page) => {
          if (page != null && typeof page === "object" && "text" in page) {
            return String((page as { text?: unknown }).text ?? "");
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }

    return JSON.stringify(payload);
  }

  private getCandidateContext(userMessage: string, extractedText: string, selectedTypeId?: string) {
    const combined = `${userMessage}\n${extractedText}`.toLowerCase();
    const candidateTypes = selectedTypeId == null
      ? breachTypes
          .filter((type) => type.triggerKeywords.some((keyword) => combined.includes(keyword.toLowerCase())))
          .slice(0, 3)
      : breachTypes.filter((type) => type.id === selectedTypeId);

    const fallbackTypes = candidateTypes.length > 0 ? candidateTypes : breachTypes.slice(0, 6);
    const actionsByType = Object.fromEntries(
      fallbackTypes.map((type) => [
        type.id,
        actionItems
          .filter((action) => action.breachTypeId === type.id)
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 8),
      ]),
    );

      return {
      types: fallbackTypes,
      providersByType: Object.fromEntries(
        fallbackTypes.map((type) => [
          type.id,
          providers
            .filter((provider) => provider.breachTypeId === type.id)
            .map((provider) => ({
              id: provider.id,
              name: provider.name,
              aliases: provider.aliases,
              category: provider.category,
            })),
        ]),
      ),
      actionsByType,
    };
  }

  private systemPrompt(): string {
    return [
      "너는 개인정보 유출 사고 대응을 돕는 IDly의 AI 어시스턴트야.",
      "OCR 텍스트와 유저 메시지를 보고 유출/위협 유형을 판단해 반드시 JSON만 응답해.",
      "OCR 추출물은 오탈자와 줄바꿈 깨짐이 있을 수 있으니 문맥으로 보정해.",
      "actions에는 candidate_actions_by_type에 실제로 존재하는 action_item_id만 넣어. 없는 전화번호나 링크를 지어내지 마.",
      "candidate_providers_by_type의 aliases가 OCR 텍스트나 유저 메시지에 보이면 해당 provider 전용 action_item_id를 generic action보다 우선 선택해.",
      "근거 텍스트에 없는 회사명, 피해 범위, '모든 카드/계정' 같은 범위를 추측해서 확대하지 마.",
      "즉시 대응이 필요한 유형은 2~3개 액션을 우선순위 순서로 반환해. provider 전용 액션이 있으면 1번으로 둬.",
      "확신이 없으면 confidence를 low로 두고 clarifying_question을 채워.",
      "스토킹, 위치추적, 지속 괴롭힘, 불법촬영물, 유포 협박, 성적 착취, 신체 안전 위협이 감지되면 safety_flag를 refer_to_specialist로 설정하고 actions는 빈 배열로 둬.",
      "복수 유형이 감지되면 detected_types에 모두 넣고, actions는 각 유형의 최우선 액션만 우선 포함해.",
      "ai_message는 2~3문장 이내로 짧게 작성하고, 확정 가능한 사실과 다음 행동의 이유만 말해. 실행 방법은 actions 카드로만 전달해.",
    ].join("\n");
  }

  private refineModelResult(result: ModelAnalyzeResult, sourceText: string): ModelAnalyzeResult {
    if (result.safety_flag === "refer_to_specialist") {
      return result;
    }

    const detectedTypeIds = result.detected_types.filter((typeId) =>
      breachTypes.some((type) => type.id === typeId),
    );

    if (detectedTypeIds.length === 0) {
      return result;
    }

    if (result.confidence !== "high" && this.isTooAmbiguousForResidentIdLeak(detectedTypeIds, sourceText)) {
      return {
        detected_types: [],
        confidence: "low",
        clarifying_question: "어떤 정보가 유출됐다고 확인하셨나요? 카드, 계정, 통신사, 주민번호나 신분증 중 어디에 가까운지 알려주세요.",
        safety_flag: null,
        actions: [],
        ai_message: "유출된 정보 종류를 알면 바로 맞는 대응카드로 안내할게요.",
      };
    }

    const preferredActions: ActionItem[] = [];
    const matchedProviderIds = new Set<string>();
    const matchedProviderNames: string[] = [];

    for (const typeId of detectedTypeIds) {
      const matchedProviders = providers.filter(
        (provider) =>
          provider.breachTypeId === typeId &&
          provider.aliases.some((alias) => this.matchesAlias(sourceText, alias)),
      );

      for (const provider of matchedProviders) {
        matchedProviderIds.add(provider.id);
        matchedProviderNames.push(provider.name);
        const providerActions = actionItems
          .filter((action) => action.breachTypeId === typeId && action.providerId === provider.id)
          .sort((a, b) => a.priority - b.priority);
        preferredActions.push(...providerActions);
      }

      const commonActions = actionItems
        .filter((action) => action.breachTypeId === typeId && this.isCommonAction(action))
        .sort((a, b) => a.priority - b.priority);
      preferredActions.push(...commonActions);
    }

    const modelActions = result.actions
      .map(({ action_item_id }) => actionItems.find((action) => action.id === action_item_id))
      .filter((action): action is ActionItem => action != null)
      .filter((action) => {
        if (!detectedTypeIds.includes(action.breachTypeId)) {
          return false;
        }
        if (action.providerId == null || this.isCommonAction(action)) {
          return true;
        }
        return matchedProviderIds.has(action.providerId);
      });

    const refinedActionIds = this.dedupeActions([...preferredActions, ...modelActions])
      .filter((action) => detectedTypeIds.includes(action.breachTypeId))
      .sort((a, b) => this.getActionRank(a, matchedProviderIds) - this.getActionRank(b, matchedProviderIds))
      .slice(0, 3)
      .map((action) => ({ action_item_id: action.id }));

    return {
      ...result,
      detected_types: detectedTypeIds,
      actions: refinedActionIds.length > 0 ? refinedActionIds : result.actions,
      clarifying_question:
        result.confidence === "high" && matchedProviderNames.length > 0
          ? null
          : result.clarifying_question,
      ai_message: this.sanitizeAiMessage(result, detectedTypeIds, matchedProviderNames),
    };
  }

  private isCommonAction(action: ActionItem): boolean {
    if (action.providerId == null) {
      return true;
    }

    const provider = providers.find((item) => item.id === action.providerId);
    return provider?.category === "government" || provider?.category === "credit_bureau";
  }

  private sanitizeAiMessage(
    result: ModelAnalyzeResult,
    detectedTypeIds: string[],
    matchedProviderNames: string[],
  ): string {
    const shouldUseFallback =
      /\bact_[a-z0-9_]+\b/.test(result.ai_message) ||
      /OCR\s*결과/i.test(result.ai_message) ||
      /마스킹|고객센터\(|https?:\/\/|☎|[a-z0-9.-]+\.(go\.kr|or\.kr|com|kr)|\(\d{2,4}\)|\b118\b|\d{2,4}-?\d{3,4}-?\d{4}/i.test(result.ai_message);

    if (!shouldUseFallback) {
      return result.ai_message;
    }

    const firstType = breachTypes.find((type) => type.id === detectedTypeIds[0]);
    const providerPrefix = matchedProviderNames.length > 0 ? `${matchedProviderNames[0]} ` : "";
    const typeName = firstType?.nameKr ?? "개인정보 유출";

    return `${providerPrefix}${typeName} 상황으로 보여요. 아래 순서대로 바로 진행해 주세요.`;
  }

  private normalizeForMatch(value: string): string {
    return value.toLowerCase().replace(/\s+/g, "");
  }

  private isTooAmbiguousForResidentIdLeak(detectedTypeIds: string[], sourceText: string): boolean {
    if (detectedTypeIds.length !== 1 || detectedTypeIds[0] !== "resident_id_leak") {
      return false;
    }

    const normalized = sourceText.toLowerCase();
    const strongResidentEvidence = [
      "주민등록번호",
      "주민번호",
      "주민등록증",
      "신분증",
      "운전면허",
      "면허증",
      "여권",
      "사본",
    ];

    return !strongResidentEvidence.some((keyword) => normalized.includes(keyword));
  }

  private getActionRank(action: ActionItem, matchedProviderIds: Set<string>): number {
    const provider = providers.find((item) => item.id === action.providerId);

    if (action.priority === 1 && (provider?.category === "government" || provider?.category === "credit_bureau")) {
      return 0;
    }

    if (action.providerId != null && matchedProviderIds.has(action.providerId)) {
      return 10 + action.priority;
    }

    if (action.providerId == null) {
      return 20 + action.priority;
    }

    if (provider?.category === "government" || provider?.category === "credit_bureau") {
      return 30 + action.priority;
    }

    return 40 + action.priority;
  }

  private matchesAlias(input: string, alias: string): boolean {
    const normalizedInput = input.toLowerCase();
    const normalizedAlias = alias.toLowerCase();

    if (/^[a-z0-9+.\-\s]+$/i.test(alias)) {
      const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(normalizedInput);
    }

    return this.normalizeForMatch(input).includes(this.normalizeForMatch(alias));
  }

  private dedupeActions(actions: ActionItem[]): ActionItem[] {
    const seen = new Set<string>();
    return actions.filter((action) => {
      if (seen.has(action.id)) {
        return false;
      }
      seen.add(action.id);
      return true;
    });
  }

  private responseSchema() {
    return {
      type: "object",
      additionalProperties: false,
      required: [
        "detected_types",
        "confidence",
        "clarifying_question",
        "safety_flag",
        "actions",
        "ai_message",
      ],
      properties: {
        detected_types: {
          type: "array",
          items: { type: "string" },
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
        },
        clarifying_question: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        safety_flag: {
          anyOf: [{ type: "string", enum: ["refer_to_specialist"] }, { type: "null" }],
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["action_item_id"],
            properties: {
              action_item_id: { type: "string" },
            },
          },
        },
        ai_message: {
          type: "string",
        },
      },
    };
  }
}
