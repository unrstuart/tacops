import type { BonusObjective } from "../api/types";
import type { CharacterProfile } from "../characters/character-profile";

export function characterSatisfiesObjective(profile: CharacterProfile, objective: BonusObjective): boolean {
  if (objective.objectiveType === "HasRangedAttack") {
    return profile.hasRangedAttack;
  }
  if (objective.objectiveType === "HasNoRangedAttack") {
    return !profile.hasRangedAttack;
  }

  const target = objective.objectiveTarget;
  if (!target) {
    throw new Error(`Objective type "${objective.objectiveType}" requires a target but none was provided`);
  }
  switch (objective.objectiveType) {
    case "Trait":
      return profile.traits.includes(target);
    case "DamageType":
      return profile.damageProfiles.includes(target);
    case "Faction":
      return profile.faction === target;
    default:
      throw new Error(`Unknown objective type: ${objective.objectiveType}`);
  }
}
