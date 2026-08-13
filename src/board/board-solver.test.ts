import { describe, expect, it } from "vitest";
import { findMinimalRequiredSubset, type GroupRequirement } from "./board-solver";

describe("findMinimalRequiredSubset", () => {
  it("excludes a character whose only objective is already covered by someone else", () => {
    // Reported scenario: trait:parry, faction:black templars (x2), damage:bolter, damage:flame.
    // Helbrecht alone can satisfy parry; Helbrecht+Vindicta are the only two black templars among
    // the assigned set (count 2, so both are needed); either Helbrecht or Isabella can cover
    // bolter, but Helbrecht already does via the other groups, so Isabella shouldn't be required;
    // only Godswyl can cover flame. Mephiston is eligible for nothing and should stay optional.
    const assignedIds = ["helbrecht", "godswyl", "isabella", "vindicta", "mephiston"];
    const groupRequirements: GroupRequirement[] = [
      { key: "Trait::Parry", count: 1, eligibleAssignedIds: ["helbrecht"] },
      { key: "Faction::BlackTemplars", count: 2, eligibleAssignedIds: ["helbrecht", "godswyl"] },
      { key: "DamageType::Bolter", count: 1, eligibleAssignedIds: ["helbrecht", "isabella"] },
      { key: "DamageType::Flame", count: 1, eligibleAssignedIds: ["vindicta"] },
    ];

    const required = findMinimalRequiredSubset(assignedIds, groupRequirements);

    expect(required).toEqual(new Set(["helbrecht", "vindicta", "godswyl"]));
  });

  it("requires everyone when there's no overlap between groups", () => {
    const assignedIds = ["a", "b", "c"];
    const groupRequirements: GroupRequirement[] = [
      { key: "g1", count: 1, eligibleAssignedIds: ["a"] },
      { key: "g2", count: 1, eligibleAssignedIds: ["b"] },
      { key: "g3", count: 1, eligibleAssignedIds: ["c"] },
    ];

    const required = findMinimalRequiredSubset(assignedIds, groupRequirements);

    expect(required).toEqual(new Set(["a", "b", "c"]));
  });

  it("requires no one when there are no objective groups", () => {
    const assignedIds = ["a", "b", "c"];

    const required = findMinimalRequiredSubset(assignedIds, []);

    expect(required).toEqual(new Set());
  });
});
