import { Injectable, NotFoundException } from "@nestjs/common";

import { actionItems, breachTypes, providers, specialistReferrals } from "../../domain/seed.js";
import type { ActionItem, BreachType, Provider } from "../../domain/types.js";

@Injectable()
export class ActionsService {
  getBreachTypes(): BreachType[] {
    return breachTypes;
  }

  getProviders(breachTypeId?: string): Provider[] {
    if (breachTypeId == null) {
      return providers;
    }
    return providers.filter((provider) => provider.breachTypeId === breachTypeId);
  }

  getActions(breachTypeId?: string): ActionItem[] {
    const actions = breachTypeId == null
      ? actionItems
      : actionItems.filter((action) => action.breachTypeId === breachTypeId);

    return [...actions].sort((a, b) => a.priority - b.priority);
  }

  getActionById(actionId: string): ActionItem {
    const action = actionItems.find((item) => item.id === actionId);
    if (action == null) {
      throw new NotFoundException(`Unknown action item: ${actionId}`);
    }
    return action;
  }

  getTypeById(typeId: string): BreachType | undefined {
    return breachTypes.find((type) => type.id === typeId);
  }

  getCandidateTypes(input: string): BreachType[] {
    const normalized = input.toLowerCase();
    return breachTypes.filter((type) =>
      type.triggerKeywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
    );
  }

  getMatchingProviders(input: string, breachTypeId: string): Provider[] {
    return providers.filter(
      (provider) =>
        provider.breachTypeId === breachTypeId &&
        provider.aliases.some((alias) => this.matchesAlias(input, alias)),
    );
  }

  getRecommendedActions(input: string, detectedTypeIds: string[]): ActionItem[] {
    const recommended: ActionItem[] = [];

    for (const typeId of detectedTypeIds) {
      const type = this.getTypeById(typeId);
      if (type == null) {
        continue;
      }

      const typeActions = this.getActions(typeId);
      const matchedProviders = this.getMatchingProviders(input, typeId);

      if (matchedProviders.length > 0) {
        for (const provider of matchedProviders) {
          const providerAction = typeActions.find((action) => action.providerId === provider.id);
          if (providerAction != null) {
            recommended.push(providerAction);
          }
        }
      }

      const genericActions = typeActions.filter((action) => action.providerId == null);
      const governmentActions = typeActions.filter((action) => {
        const provider = providers.find((item) => item.id === action.providerId);
        return provider?.category === "government" || provider?.category === "credit_bureau";
      });

      const fallbackActions = [...genericActions, ...governmentActions].slice(0, type.requiresProviderSelection ? 1 : 2);
      recommended.push(...fallbackActions);
    }

    return this.dedupeActions(recommended)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, Math.max(1, detectedTypeIds.length * 2));
  }

  validateActionIds(actionIds: string[]): ActionItem[] {
    return actionIds
      .map((id) => actionItems.find((action) => action.id === id))
      .filter((action): action is ActionItem => action != null);
  }

  getSpecialistReferrals() {
    return specialistReferrals;
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

  private matchesAlias(input: string, alias: string): boolean {
    const normalizedInput = input.toLowerCase();
    const normalizedAlias = alias.toLowerCase();

    if (/^[a-z0-9+.\-\s]+$/i.test(alias)) {
      const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(normalizedInput);
    }

    return normalizedInput.replace(/\s+/g, "").includes(normalizedAlias.replace(/\s+/g, ""));
  }
}
