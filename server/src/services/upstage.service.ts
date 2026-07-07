import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ModelAnalyzeResult } from "../../domain/types.js";
import { actionItems, breachTypes } from "../../domain/seed.js";

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
    return this.callSolar({
      apiKey,
      userMessage: input.text,
      extractedText,
      selectedTypeId: input.selectedTypeId,
    });
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
      actionsByType,
    };
  }

  private systemPrompt(): string {
    return [
      "너는 개인정보 유출 사고 대응을 돕는 IDly의 AI 어시스턴트야.",
      "OCR 텍스트와 유저 메시지를 보고 유출/위협 유형을 판단해 반드시 JSON만 응답해.",
      "OCR 추출물은 오탈자와 줄바꿈 깨짐이 있을 수 있으니 문맥으로 보정해.",
      "actions에는 candidate_actions_by_type에 실제로 존재하는 action_item_id만 넣어. 없는 전화번호나 링크를 지어내지 마.",
      "확신이 없으면 confidence를 low로 두고 clarifying_question을 채워.",
      "스토킹, 위치추적, 지속 괴롭힘, 불법촬영물, 유포 협박, 성적 착취, 신체 안전 위협이 감지되면 safety_flag를 refer_to_specialist로 설정하고 actions는 빈 배열로 둬.",
      "복수 유형이 감지되면 detected_types에 모두 넣고, actions는 각 유형의 최우선 액션만 우선 포함해.",
      "ai_message는 2~3문장 이내로 짧게 작성하고 실행 방법은 actions 카드로만 전달해.",
    ].join("\n");
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
