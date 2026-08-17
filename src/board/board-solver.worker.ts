import { solveBoardAssignment, type BoardSolution } from "./board-solver";
import type { ExpeditionBoardEntry, RawUnit } from "../api/types";
import type { ResourceKey } from "./reward-amount";

export interface SolveRequest {
  requestId: number;
  board: ExpeditionBoardEntry[];
  heroes: RawUnit[];
  priorityOrder: [ResourceKey, ResourceKey, ResourceKey];
}

// "status" here is the worker-protocol outcome (did the call throw an unexpected exception);
// "solveStatus" is solveBoardAssignment's own normal, non-exceptional outcome - "heuristic" (the
// LP couldn't find anything, so a greedy fallback was used instead) is still a "success" at this
// level, just with an assignment that isn't guaranteed optimal.
export type SolveResponse =
  | {
      requestId: number;
      status: "success";
      assignmentEntries: Array<[string, BoardSolution]>;
      solveStatus: "ok" | "degraded" | "heuristic";
      message?: string;
    }
  | {
      requestId: number;
      status: "error";
      error: string;
    };

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const { requestId, board, heroes, priorityOrder } = event.data;
  try {
    const { assignment, status, message } = solveBoardAssignment(board, heroes, priorityOrder);
    const response: SolveResponse = {
      requestId,
      status: "success",
      assignmentEntries: [...assignment.entries()],
      solveStatus: status,
      message,
    };
    self.postMessage(response);
  } catch (error) {
    const response: SolveResponse = { requestId, status: "error", error: `${error}` };
    self.postMessage(response);
  }
};
