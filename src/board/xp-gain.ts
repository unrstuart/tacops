import type { Rarity } from "../rarity/rarity.enum";
import { RarityMapper } from "../rarity/rarity.mapper";

// Calibrated from two example points ((1000-200)/(59-12) ≈ 17.02 xp per level) — replace once real numbers are known.
const ROUGH_XP_PER_LEVEL = 17;

export function isXpCapped(rarity: Rarity, xpLevel: number): boolean {
  return xpLevel >= RarityMapper.xpLevelCap[rarity];
}

export function estimateXpGain(rarity: Rarity, xpLevel: number): number {
  return isXpCapped(rarity, xpLevel) ? 0 : ROUGH_XP_PER_LEVEL * xpLevel;
}
