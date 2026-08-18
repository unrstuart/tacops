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

export interface PlayerResources {
  stamina: number;
  staminaNextTokenAt: number | null;
  staminaCapAt: number | null;
  treasureBeach: number;
  treasureBeachNextTokenAt: number | null;
  treasureBeachCapAt: number | null;
  waves: number;
  wavesNextTokenAt: number | null;
  wavesCapAt: number | null;
  pvp: number;
  pvpPosition: number | null;
  pvpGroupSize: number | null;
  pvpNextTokenAt: number | null;
  pvpCapAt: number | null;
  pvpPausesAt: number | null;
  pvpStopped: boolean;
  guildBoss: number; // "raid tokens" - has special burn-at-cap logic, see guildBossBurnAt
  guildBossNextTokenAt: number | null;
  guildBossCapAt: number | null;
  guildBossBurnAt: number | null;
  guildBossBomb: number;
  guildBossBombNextTokenAt: number | null;
  guildBossBombCapAt: number | null;
  mowAmmo: number;
}
