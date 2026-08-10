export type Environment = "prod" | "qa";

export interface Credentials {
  userId: string;
  clientSecret: string;
  snowId: string;
}

export interface BonusObjective {
  objectiveType: string;
  objectiveTarget?: string;
}

export interface ExpeditionBoardEntry {
  expeditionId: string;
  id: string;
  category: string;
  rarity: string;
  participants: number;
  duration: number;
  bonusObjectives: BonusObjective[];
  baseRewards: string[];
  bonusRewards: string[];
  status: string;
  units?: string[];
}

export type RawUnit = {
  id: string;
  rank?: number;
  progressionIndex?: number;
  xpLevel?: number;
} & Record<string, unknown>;
