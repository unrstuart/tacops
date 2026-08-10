import { OperationCard } from "./OperationCard";
import { sortByRarityDescending } from "../board/board-view-model";
import type { ExpeditionBoardEntry } from "../api/types";
import type { BoardAssignmentResult } from "../board/board-solver";

export function OperationsCards({
  board,
  assignment,
}: {
  board: ExpeditionBoardEntry[];
  assignment: BoardAssignmentResult;
}) {
  if (board.length === 0) {
    return <p>No expeditions on the board right now.</p>;
  }

  const sorted = sortByRarityDescending(board);

  return (
    <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((entry) => (
        <OperationCard key={entry.expeditionId} entry={entry} assignment={assignment} />
      ))}
    </div>
  );
}
