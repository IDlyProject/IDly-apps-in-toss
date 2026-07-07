import { Injectable } from "@nestjs/common";

import type { AnalyzeRequest, AnalyzeResult, ModelAnalyzeResult } from "../../domain/types.js";
import { ActionsService } from "./actions.service.js";
import { UpstageService } from "./upstage.service.js";

interface AnalyzeInput {
  request: AnalyzeRequest;
  image?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  };
}

const safetyKeywords = [
  "스토킹",
  "위치추적",
  "불법촬영",
  "유포 협박",
  "성착취",
  "협박",
  "죽이",
  "때리",
  "감금",
];

@Injectable()
export class AnalyzeService {
  constructor(
    private readonly actionsService: ActionsService,
    private readonly upstageService: UpstageService,
  ) {}

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const text = input.request.text?.trim() ?? "";
    const selectedTypeId = input.request.selectedTypeId;

    if (this.hasSafetyRisk(text)) {
      return this.toSpecialistResult();
    }

    if (this.upstageService.shouldUseLiveCalls()) {
      const modelResult = await this.upstageService.analyzeWithUpstage({
        text,
        selectedTypeId,
        image: input.image,
      });
      return this.fromModelResult(modelResult);
    }

    return this.localAnalyze({ text, selectedTypeId });
  }

  private localAnalyze(input: { text: string; selectedTypeId?: string }): AnalyzeResult {
    const selectedType = input.selectedTypeId == null
      ? undefined
      : this.actionsService.getTypeById(input.selectedTypeId);

    const candidates = selectedType == null
      ? this.actionsService.getCandidateTypes(input.text)
      : [selectedType];

    if (candidates.length === 0) {
      return {
        detectedTypes: [],
        confidence: "low",
        clarifyingQuestion: "어떤 정보가 유출됐다고 나와있나요? 카드, 통신사, 계정, 신분증 중 어디에 가까운지 알려주세요.",
        safetyFlag: null,
        actions: [],
        aiMessage: "정확한 상황을 조금 더 알려주시면 바로 도와드릴게요.",
        source: "local",
      };
    }

    const detectedTypes = candidates.slice(0, 3).map((type) => type.id);
    const actions = this.actionsService.getRecommendedActions(input.text, detectedTypes);
    const needsProvider = candidates.some((type) => type.requiresProviderSelection);
    const hasProviderMatch = detectedTypes.some(
      (typeId) => this.actionsService.getMatchingProviders(input.text, typeId).length > 0,
    );

    return {
      detectedTypes,
      confidence: input.selectedTypeId != null || hasProviderMatch ? "high" : "medium",
      clarifyingQuestion:
        needsProvider && !hasProviderMatch
          ? "어느 기관에서 온 안내인지 알려주시면 해당 연락처로 바로 연결해드릴게요."
          : null,
      safetyFlag: null,
      actions,
      aiMessage: needsProvider && !hasProviderMatch
        ? `${candidates[0]?.nameKr ?? "개인정보 유출"} 상황이에요. 어떤 카드사·서비스인지 알려주시면 해당 연락처로 바로 연결해드릴게요. 우선 아래 조치부터 진행하세요.`
        : `${candidates[0]?.nameKr ?? "개인정보 유출"} 상황으로 보여요. 아래 순서대로 바로 진행해 주세요.`,
      source: "local",
    };
  }

  private fromModelResult(result: ModelAnalyzeResult): AnalyzeResult {
    if (result.safety_flag === "refer_to_specialist") {
      return this.toSpecialistResult(result.ai_message);
    }

    const actions = this.actionsService.validateActionIds(
      result.actions.map((action) => action.action_item_id),
    );

    return {
      detectedTypes: result.detected_types,
      confidence: result.confidence,
      clarifyingQuestion: result.clarifying_question,
      safetyFlag: null,
      actions,
      aiMessage: result.ai_message,
      source: "upstage",
    };
  }

  private toSpecialistResult(aiMessage?: string): AnalyzeResult {
    return {
      detectedTypes: [],
      confidence: "high",
      clarifyingQuestion: null,
      safetyFlag: "refer_to_specialist",
      actions: [],
      specialistReferrals: this.actionsService.getSpecialistReferrals(),
      aiMessage:
        aiMessage ??
        "힘든 상황을 겪고 계신 것 같아요. 지금 상황은 전문 상담이 더 도움이 될 수 있어요.",
      source: "local",
    };
  }

  private hasSafetyRisk(text: string): boolean {
    const normalized = text.toLowerCase();
    return safetyKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
  }
}
