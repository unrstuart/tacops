import { Rarity } from "../rarity/rarity.enum";
import { RarityMapper } from "../rarity/rarity.mapper";
import { rarityIconUrl } from "../rarity/rarity-icon";
import { traitIconUrl } from "../characters/trait-icon";
import { damageProfileIconUrl } from "../characters/damage-profile-icon";
import { characterPortraitUrl } from "../characters/character-portraits";
import { factionIconUrl } from "../factions/faction-icon";
import { rangedAttackIconUrl } from "./ranged-attack-icon";
import { rewardIconUrl } from "./reward-icon";
import { operationTypeIconUrl } from "./operation-type-icon";
import { isCharacterId } from "../api/fetch-player-data";
import type { BonusObjective, ExpeditionBoardEntry } from "../api/types";

export function entryRarity(entry: ExpeditionBoardEntry): Rarity {
  const rarity = RarityMapper.stringToRarity(entry.rarity);
  if (rarity === undefined) {
    throw new Error(`Unknown board rarity: ${entry.rarity}`);
  }
  return rarity;
}

export function sortByRarityDescending(board: ExpeditionBoardEntry[]): ExpeditionBoardEntry[] {
  return [...board].sort((a, b) => entryRarity(b) - entryRarity(a));
}

export function categoryIconUrl(entry: ExpeditionBoardEntry): string {
  return operationTypeIconUrl(entry.category);
}

export function entryRarityIconUrl(entry: ExpeditionBoardEntry): string {
  return rarityIconUrl(entryRarity(entry));
}

export interface ObjectiveDisplay {
  label: string;
  iconUrl?: string;
  badge?: "no-ranged-attack";
}

export function getObjectiveDisplay(objective: BonusObjective): ObjectiveDisplay {
  const label = objective.objectiveTarget
    ? `${objective.objectiveType}: ${objective.objectiveTarget}`
    : objective.objectiveType;

  if (objective.objectiveType === "HasNoRangedAttack") {
    return { label, iconUrl: rangedAttackIconUrl(), badge: "no-ranged-attack" };
  }
  if (objective.objectiveType === "HasRangedAttack") {
    return { label, iconUrl: rangedAttackIconUrl() };
  }
  if (!objective.objectiveTarget) {
    return { label };
  }
  switch (objective.objectiveType) {
    case "Trait":
      return { label, iconUrl: traitIconUrl(objective.objectiveTarget) };
    case "DamageType":
      return { label, iconUrl: damageProfileIconUrl(objective.objectiveTarget) };
    case "Faction":
      return { label, iconUrl: factionIconUrl(objective.objectiveTarget) };
    default:
      return { label };
  }
}

export interface RewardChip {
  label: string;
  iconUrl?: string;
  amount?: string;
}

export function getRewardChips(rewards: string[]): RewardChip[] {
  return rewards.map((reward) => {
    const [key, amount] = reward.split(":");
    const iconUrl = rewardIconUrl(key);
    return iconUrl ? { label: reward, iconUrl, amount } : { label: reward };
  });
}

export interface DispatchedUnit {
  unitId: string;
  portraitUrl?: string;
}

export function getDispatchedUnits(entry: ExpeditionBoardEntry): DispatchedUnit[] | undefined {
  if (entry.status !== "Dispatched" || !entry.units || entry.units.length === 0) {
    return undefined;
  }
  return entry.units.map((unitId) => ({
    unitId,
    portraitUrl: isCharacterId(unitId) ? characterPortraitUrl(unitId) : undefined,
  }));
}
