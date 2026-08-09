import { Rank } from "../rank/rank.enum";
import { Rarity } from "../rarity/rarity.enum";

export interface RankedUnit {
  rarity: Rarity;
  rank: Rank;
}

const BOARD_MIN_RANK: Partial<Record<Rarity, Rank>> = {
  [Rarity.Uncommon]: Rank.Iron1,
  [Rarity.Rare]: Rank.Bronze1,
  [Rarity.Epic]: Rank.Silver1,
  [Rarity.Legendary]: Rank.Gold1,
  [Rarity.Mythic]: Rank.Diamond3,
};

export class BoardFilter {
  public static byRank<T extends RankedUnit>(units: T[], boardRarity: Rarity): T[] {
    const minRank = BOARD_MIN_RANK[boardRarity];
    if (minRank === undefined) {
      return units;
    }
    return units.filter((unit) => unit.rank >= minRank);
  }
  public static byRarity<T extends RankedUnit>(units: T[], boardRarity: Rarity): T[] {
    return units.filter((unit) => unit.rarity >= boardRarity);
  }
}
