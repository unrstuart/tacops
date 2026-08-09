import { Rarity } from '../rarity/rarity.enum';
import { RarityStars } from '../rarity/rarity-stars.enum';

export interface ProgressionIndexInfo {
    rarity: Rarity;
    stars: RarityStars;
}

export const PROGRESSION_INDEX_TABLE: Record<number, ProgressionIndexInfo> = {
    0: { rarity: Rarity.Common, stars: RarityStars.None },
    1: { rarity: Rarity.Common, stars: RarityStars.OneStar },
    2: { rarity: Rarity.Common, stars: RarityStars.TwoStars },
    3: { rarity: Rarity.Uncommon, stars: RarityStars.TwoStars },
    4: { rarity: Rarity.Uncommon, stars: RarityStars.ThreeStars },
    5: { rarity: Rarity.Uncommon, stars: RarityStars.FourStars },
    6: { rarity: Rarity.Rare, stars: RarityStars.FourStars },
    7: { rarity: Rarity.Rare, stars: RarityStars.FiveStars },
    8: { rarity: Rarity.Rare, stars: RarityStars.RedOneStar },
    9: { rarity: Rarity.Epic, stars: RarityStars.RedOneStar },
    10: { rarity: Rarity.Epic, stars: RarityStars.RedTwoStars },
    11: { rarity: Rarity.Epic, stars: RarityStars.RedThreeStars },
    12: { rarity: Rarity.Legendary, stars: RarityStars.RedThreeStars },
    13: { rarity: Rarity.Legendary, stars: RarityStars.RedFourStars },
    14: { rarity: Rarity.Legendary, stars: RarityStars.RedFiveStars },
    15: { rarity: Rarity.Legendary, stars: RarityStars.OneBlueStar },
    16: { rarity: Rarity.Mythic, stars: RarityStars.OneBlueStar },
    17: { rarity: Rarity.Mythic, stars: RarityStars.TwoBlueStars },
    18: { rarity: Rarity.Mythic, stars: RarityStars.ThreeBlueStars },
    19: { rarity: Rarity.Mythic, stars: RarityStars.MythicWings },
};

export class ProgressionIndexMapper {
    public static toInfo(progressionIndex: number | undefined | null): ProgressionIndexInfo {
        if (progressionIndex === undefined || progressionIndex === null) {
            return { rarity: Rarity.Common, stars: RarityStars.None };
        }
        const info = PROGRESSION_INDEX_TABLE[progressionIndex];
        if (!info) {
            throw new Error(`Unknown progressionIndex: ${progressionIndex}`);
        }
        return info;
    }

    public static toRarity(progressionIndex: number | undefined | null): Rarity {
        return ProgressionIndexMapper.toInfo(progressionIndex).rarity;
    }

    public static toStars(progressionIndex: number | undefined | null): RarityStars {
        return ProgressionIndexMapper.toInfo(progressionIndex).stars;
    }
}
