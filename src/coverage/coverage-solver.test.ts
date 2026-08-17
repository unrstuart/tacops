import { describe, expect, it } from "vitest";
import { solveCombo, UNREACHABLE } from "./coverage-solver";
import type { CharacterProfile } from "../characters/character-profile";
import type { BonusObjective } from "../api/types";

function profile(overrides: Partial<CharacterProfile>): CharacterProfile {
  return {
    name: "Test",
    damageProfiles: [],
    traits: [],
    alliance: "Imperial",
    faction: "Ultramarines",
    hasRangedAttack: false,
    ...overrides,
  };
}

describe("solveCombo", () => {
  it("lets one character cover two different objectives at once, but not two copies of the same one", () => {
    // objectives: [Flying, Flying, DamageType:Bolter]
    const objectives: BonusObjective[] = [
      { objectiveType: "Trait", objectiveTarget: "Flying" },
      { objectiveType: "Trait", objectiveTarget: "Flying" },
      { objectiveType: "DamageType", objectiveTarget: "Bolter" },
    ];
    // index 0 = Dante (Flying only), index 1 = Bellator (Flying + Bolter)
    const profiles: CharacterProfile[] = [
      profile({ name: "Dante", traits: ["Flying"] }),
      profile({ name: "Bellator", traits: ["Flying"], damageProfiles: ["Bolter"] }),
    ];

    const result = solveCombo(objectives, profiles);

    // Dante alone can't cover both Flying slots, but combined with Bellator (who simultaneously
    // covers the other Flying slot AND Bolter) only 2 distinct characters are needed.
    expect(result[0]).toBe(2); // Dante usable, minimum total including him is 2
    expect(result[1]).toBe(2); // Bellator usable, minimum total including him is 2
  });

  it("marks a character unreachable if it satisfies none of the combo's objectives", () => {
    const objectives: BonusObjective[] = [{ objectiveType: "Trait", objectiveTarget: "Flying" }];
    const profiles: CharacterProfile[] = [profile({ traits: ["Psyker"] })];

    const result = solveCombo(objectives, profiles);

    expect(result[0]).toBe(UNREACHABLE);
  });

  it("marks every character unreachable when nobody in the roster satisfies a condition", () => {
    const objectives: BonusObjective[] = [
      { objectiveType: "Trait", objectiveTarget: "Flying" },
      { objectiveType: "Faction", objectiveTarget: "Necrons" },
    ];
    // Nobody has the Necrons faction, so the combo is unsolvable regardless of who covers Flying.
    const profiles: CharacterProfile[] = [profile({ traits: ["Flying"], faction: "Ultramarines" })];

    const result = solveCombo(objectives, profiles);

    expect(result[0]).toBe(UNREACHABLE);
  });

  it("excludes a character whose alliance doesn't match the op's alliance requirement, even if it satisfies the objective", () => {
    const objectives: BonusObjective[] = [{ objectiveType: "Trait", objectiveTarget: "Flying" }];
    const profiles: CharacterProfile[] = [profile({ traits: ["Flying"], alliance: "Chaos" })];

    const gated = solveCombo(objectives, profiles, "Imperial");
    expect(gated[0]).toBe(UNREACHABLE);

    const ungated = solveCombo(objectives, profiles, undefined);
    expect(ungated[0]).toBe(1);

    const matching = solveCombo(objectives, profiles, "Chaos");
    expect(matching[0]).toBe(1);
  });

  it("requires two distinct characters for two duplicate objectives even if a third condition is unused", () => {
    const objectives: BonusObjective[] = [
      { objectiveType: "Trait", objectiveTarget: "Flying" },
      { objectiveType: "Trait", objectiveTarget: "Flying" },
    ];
    const profiles: CharacterProfile[] = [
      profile({ name: "A", traits: ["Flying"] }),
      profile({ name: "B", traits: ["Flying"] }),
    ];

    const result = solveCombo(objectives, profiles);

    expect(result[0]).toBe(2);
    expect(result[1]).toBe(2);
  });
});
