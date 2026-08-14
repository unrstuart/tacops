import solver, { type Model as LpModel, type SolveResult } from "javascript-lp-solver";
import { BoardFilter, boardMinRank, type RankedUnit } from "./board-filter";
import { characterSatisfiesObjective } from "./objective-eligibility";
import { rewardAmount, type ResourceKey } from "./reward-amount";
import { estimateXpGain } from "./xp-gain";
import { requiredAlliance } from "./board-alliance";
import { entryRarity, entryIsUnavailable } from "./board-view-model";
import { intToRank } from "../rank/rank.mapper";
import { Rank } from "../rank/rank.enum";
import type { Rarity } from "../rarity/rarity.enum";
import { ProgressionIndexMapper } from "../progression/progression-index";
import { getCharacterProfile, type CharacterProfile } from "../characters/character-profile";
import { isCharacterId } from "../api/fetch-player-data";
import type { BonusObjective, ExpeditionBoardEntry, RawUnit } from "../api/types";

interface RosterCharacter extends RankedUnit {
  id: string;
  xpLevel: number;
  profile: CharacterProfile;
}

export interface BoardSolution {
  expeditionId: string;
  run: boolean;
  bonusCompleted: boolean;
  requiredCharacterIds: string[];
  optionalCharacterIds: string[];
}

export type BoardAssignmentResult = Map<string, BoardSolution>;

function committedCharacterIds(board: ExpeditionBoardEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of board) {
    if (!entryIsUnavailable(entry)) continue;
    for (const unitId of entry.units ?? []) {
      if (isCharacterId(unitId)) {
        ids.add(unitId);
      }
    }
  }
  return ids;
}

function buildRoster(heroes: RawUnit[], excludedIds: Set<string>): RosterCharacter[] {
  return heroes
    .filter((hero) => !excludedIds.has(hero.id))
    .map((hero) => ({
      id: hero.id,
      rank: intToRank(hero.rank),
      rarity: ProgressionIndexMapper.toRarity(hero.progressionIndex),
      xpLevel: hero.xpLevel ?? 0,
      profile: getCharacterProfile(hero.id),
    }));
}

function isEligibleForBoard(unit: RosterCharacter, boardRarity: Rarity, allianceRequirement: string | undefined): boolean {
  return (
    BoardFilter.byRank([unit], boardRarity).length > 0 &&
    BoardFilter.byRarity([unit], boardRarity).length > 0 &&
    (allianceRequirement === undefined || unit.profile.alliance === allianceRequirement)
  );
}

function overkillCost(unit: RankedUnit, boardRarity: Rarity): number {
  const minRank = boardMinRank(boardRarity) ?? Rank.Locked;
  return unit.rank - minRank;
}

interface ObjectiveGroup {
  key: string;
  objective: BonusObjective;
  count: number;
}

function groupObjectives(objectives: BonusObjective[]): ObjectiveGroup[] {
  const groups = new Map<string, ObjectiveGroup>();
  for (const objective of objectives) {
    const key = `${objective.objectiveType}::${objective.objectiveTarget ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { key, objective, count: 1 });
    }
  }
  return [...groups.values()];
}

type PassKey = "highReward" | "midReward" | "lowReward" | "xpGain" | "runCount" | "overkill";

const PASS_ORDER: Array<{ key: PassKey; opType: "max" | "min" }> = [
  { key: "highReward", opType: "max" },
  { key: "midReward", opType: "max" },
  { key: "lowReward", opType: "max" },
  { key: "xpGain", opType: "max" },
  { key: "runCount", opType: "max" },
  { key: "overkill", opType: "min" },
];

interface AssignRef {
  varName: string;
  characterId: string;
  boardId: string;
}

interface BuiltModel {
  model: LpModel;
  assignRefs: AssignRef[];
  runVarByBoard: Map<string, string>;
  bonusVarByBoard: Map<string, string>;
  groupsByBoard: Map<string, ObjectiveGroup[]>;
  eligibleCharactersByBoardGroup: Map<string, Map<string, string[]>>;
  participantsByBoard: Map<string, number>;
}

function buildModel(
  openBoards: ExpeditionBoardEntry[],
  roster: RosterCharacter[],
  priorityOrder: [ResourceKey, ResourceKey, ResourceKey],
): BuiltModel {
  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {};
  const binaries: Record<string, 1> = {};
  const [highKey, midKey, lowKey] = priorityOrder;

  const addCoef = (varName: string, constraintName: string, coef: number) => {
    const v = (variables[varName] ??= {});
    v[constraintName] = (v[constraintName] ?? 0) + coef;
  };

  const assignRefs: AssignRef[] = [];
  const runVarByBoard = new Map<string, string>();
  const bonusVarByBoard = new Map<string, string>();
  const groupsByBoard = new Map<string, ObjectiveGroup[]>();
  const eligibleCharactersByBoardGroup = new Map<string, Map<string, string[]>>();
  const participantsByBoard = new Map<string, number>();
  const usedCharacterIds = new Set<string>();

  for (const entry of openBoards) {
    const boardId = entry.expeditionId;
    const rarity = entryRarity(entry);
    const allianceRequirement = requiredAlliance(entry.category);
    const runVar = `run::${boardId}`;
    const yVar = `y::${boardId}`;
    runVarByBoard.set(boardId, runVar);
    bonusVarByBoard.set(boardId, yVar);
    participantsByBoard.set(boardId, entry.participants);
    binaries[runVar] = 1;
    binaries[yVar] = 1;

    constraints[`yrun::${boardId}`] = { max: 0 };
    addCoef(yVar, `yrun::${boardId}`, 1);
    addCoef(runVar, `yrun::${boardId}`, -1);

    addCoef(yVar, "highReward", rewardAmount(entry.bonusRewards, highKey));
    addCoef(yVar, "midReward", rewardAmount(entry.bonusRewards, midKey));
    addCoef(yVar, "lowReward", rewardAmount(entry.bonusRewards, lowKey));
    addCoef(runVar, "runCount", 1);

    const slotConstraint = `slots::${boardId}`;
    constraints[slotConstraint] = { equal: 0 };
    addCoef(runVar, slotConstraint, -entry.participants);

    const eligibleRoster = roster.filter((unit) => isEligibleForBoard(unit, rarity, allianceRequirement));

    for (const unit of eligibleRoster) {
      const assignVar = `assign::${unit.id}::${boardId}`;
      binaries[assignVar] = 1;
      addCoef(assignVar, slotConstraint, 1);
      addCoef(assignVar, `excl::${unit.id}`, 1);
      addCoef(assignVar, "overkill", overkillCost(unit, rarity));
      addCoef(assignVar, "xpGain", estimateXpGain(unit.rarity, unit.xpLevel));
      assignRefs.push({ varName: assignVar, characterId: unit.id, boardId });
      usedCharacterIds.add(unit.id);
    }

    const groups = groupObjectives(entry.bonusObjectives);
    groupsByBoard.set(boardId, groups);
    const groupMap = new Map<string, string[]>();
    eligibleCharactersByBoardGroup.set(boardId, groupMap);

    for (const group of groups) {
      const groupConstraint = `group::${boardId}::${group.key}`;
      constraints[groupConstraint] = { min: 0 };
      addCoef(yVar, groupConstraint, -group.count);

      const eligibleIds: string[] = [];
      for (const unit of eligibleRoster) {
        if (characterSatisfiesObjective(unit.profile, group.objective)) {
          addCoef(`assign::${unit.id}::${boardId}`, groupConstraint, 1);
          eligibleIds.push(unit.id);
        }
      }
      groupMap.set(group.key, eligibleIds);
    }
  }

  for (const characterId of usedCharacterIds) {
    constraints[`excl::${characterId}`] = { max: 1 };
  }

  const model: LpModel = {
    optimize: "highReward",
    opType: "max",
    constraints,
    variables,
    binaries,
  };

  return { model, assignRefs, runVarByBoard, bonusVarByBoard, groupsByBoard, eligibleCharactersByBoardGroup, participantsByBoard };
}

// Safety net, not a tuned value - solver.Solve() runs synchronously (this library has no
// async/worker mode of its own; we run the whole module inside a Web Worker instead so this
// can't freeze the UI thread). Bounding each pass means the worst case is "slow and logged," not
// "hangs forever."
const SOLVE_TIMEOUT_MS = 10_000;

// A timed-out branch-and-bound search can return variable values that aren't cleanly 0/1 even
// though result.feasible says true - trusting that blindly (rounding each variable independently
// in extractSolution) can produce a rounded set that violates a hard constraint, like more
// characters assigned than a board has slots, even though the model itself is correct.
function isIntegralResult(model: LpModel, result: SolveResult): boolean {
  const epsilon = 1e-6;
  for (const varName of Object.keys(model.binaries ?? {})) {
    const value = Number(result[varName] ?? 0);
    if (Math.abs(value - Math.round(value)) > epsilon) return false;
  }
  return true;
}

interface PassesResult {
  result: SolveResult | null;
  status: "ok" | "degraded" | "failed";
  message?: string;
}

// If a later pass can't finish in time, falling back to the last pass that DID complete is still
// a fully valid, feasible assignment - just not optimized for the lower-priority tiers beyond
// that point. If even the first pass can't produce a usable result, there's nothing to fall back
// to - report that as a normal "failed" outcome rather than throwing, so the caller can show a
// clear message and an empty board instead of an exception.
function runPasses(model: LpModel): PassesResult {
  model.timeout = SOLVE_TIMEOUT_MS;
  let lastGoodResult: SolveResult | undefined;
  for (let i = 0; i < PASS_ORDER.length; i++) {
    const pass = PASS_ORDER[i];
    model.optimize = pass.key;
    model.opType = pass.opType;
    const startedAt = performance.now();
    const result = solver.Solve(model) as SolveResult;
    const elapsedMs = Math.round(performance.now() - startedAt);
    const hitTimeout = elapsedMs >= SOLVE_TIMEOUT_MS;
    const usable = result.feasible && isIntegralResult(model, result);
    console.log(
      `[board-solver] pass "${pass.key}" (${i + 1}/${PASS_ORDER.length}): feasible=${result.feasible} integral=${usable || !result.feasible} result=${result.result} took ${elapsedMs}ms${hitTimeout ? " (HIT TIMEOUT)" : ""}`,
    );
    if (!usable) {
      if (lastGoodResult) {
        console.warn(`[board-solver] pass "${pass.key}" didn't produce a usable result - falling back to the last completed pass's solution`);
        return {
          result: lastGoodResult,
          status: "degraded",
          message: `Optimizing for "${pass.key}" took too long, so this is the best assignment found before that - it may not be fully optimal.`,
        };
      }
      console.warn(`[board-solver] pass "${pass.key}" didn't produce a usable result and there's no earlier fallback`);
      return {
        result: null,
        status: "failed",
        message: "We weren't able to find a viable solution for these operations - please fill them in yourself this time.",
      };
    }
    lastGoodResult = result;
    if (i < PASS_ORDER.length - 1) {
      model.constraints[pass.key] = { equal: Math.round(Number(result.result)) };
    }
  }
  return { result: lastGoodResult!, status: "ok" };
}

function extractSolution(built: BuiltModel, result: SolveResult, openBoardIds: string[]): BoardAssignmentResult {
  const isOne = (name: string) => Math.round(Number(result[name] ?? 0)) === 1;

  const assignedByBoard = new Map<string, Set<string>>();
  for (const ref of built.assignRefs) {
    if (!isOne(ref.varName)) continue;
    const set = assignedByBoard.get(ref.boardId) ?? new Set<string>();
    set.add(ref.characterId);
    assignedByBoard.set(ref.boardId, set);
  }

  const solutions: BoardAssignmentResult = new Map();
  for (const boardId of openBoardIds) {
    const run = isOne(built.runVarByBoard.get(boardId)!);
    const bonusCompleted = isOne(built.bonusVarByBoard.get(boardId)!);
    const assigned = assignedByBoard.get(boardId) ?? new Set<string>();

    if (run) {
      const entryParticipants = built.participantsByBoard.get(boardId);
      if (entryParticipants !== undefined && assigned.size !== entryParticipants) {
        console.error(
          `[board-solver] INVARIANT VIOLATION: board ${boardId} has ${assigned.size} assigned character(s) but ${entryParticipants} participant slot(s) - this should be impossible; the integrality check should have caught it upstream`,
        );
      }
    }

    const required = new Set<string>();
    if (bonusCompleted) {
      const groups = built.groupsByBoard.get(boardId) ?? [];
      const eligibleByGroup = built.eligibleCharactersByBoardGroup.get(boardId)!;
      for (const group of groups) {
        const eligibleAssigned = (eligibleByGroup.get(group.key) ?? []).filter((id) => assigned.has(id));
        for (const id of eligibleAssigned.slice(0, group.count)) {
          required.add(id);
        }
      }
    }

    const optional = [...assigned].filter((id) => !required.has(id));

    solutions.set(boardId, {
      expeditionId: boardId,
      run,
      bonusCompleted,
      requiredCharacterIds: [...required],
      optionalCharacterIds: optional,
    });
  }
  return solutions;
}

export interface SolveBoardAssignmentResult {
  assignment: BoardAssignmentResult;
  status: "ok" | "degraded" | "failed";
  message?: string;
}

export function solveBoardAssignment(
  board: ExpeditionBoardEntry[],
  heroes: RawUnit[],
  priorityOrder: [ResourceKey, ResourceKey, ResourceKey],
): SolveBoardAssignmentResult {
  const openBoards = board.filter((entry) => !entryIsUnavailable(entry));
  if (openBoards.length === 0) {
    return { assignment: new Map(), status: "ok" };
  }

  const roster = buildRoster(heroes, committedCharacterIds(board));
  const built = buildModel(openBoards, roster, priorityOrder);
  const variableCount = Object.keys(built.model.variables).length;
  const constraintCount = Object.keys(built.model.constraints).length;
  console.log(
    `[board-solver] solving: ${openBoards.length} open board(s), ${roster.length} roster character(s), ${variableCount} variable(s), ${constraintCount} constraint(s)`,
  );
  const solveStartedAt = performance.now();
  const { result: finalResult, status, message } = runPasses(built.model);
  console.log(`[board-solver] total solve time: ${Math.round(performance.now() - solveStartedAt)}ms`);
  if (finalResult === null) {
    return { assignment: new Map(), status, message };
  }
  const assignment = extractSolution(
    built,
    finalResult,
    openBoards.map((entry) => entry.expeditionId),
  );
  return { assignment, status, message };
}
