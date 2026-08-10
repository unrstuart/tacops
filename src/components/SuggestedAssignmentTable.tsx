import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import {
  sortByRarityDescending,
  categoryIconUrl,
  entryAllianceIconUrl,
  entryRarityIconUrl,
  getDispatchedUnits,
} from "../board/board-view-model";
import { deployIconUrl } from "../board/deploy-icon";
import { characterPortraitUrl } from "../characters/character-portraits";
import type { ExpeditionBoardEntry } from "../api/types";
import type { BoardAssignmentResult } from "../board/board-solver";

const cellClass = "border-b border-black/10 px-3 py-2 align-top dark:border-white/15";

function AllianceCell({ entry }: { entry: ExpeditionBoardEntry }) {
  const iconUrl = entryAllianceIconUrl(entry);
  return iconUrl ? <Icon src={iconUrl} /> : null;
}

function PortraitList({ ids }: { ids: string[] }) {
  if (ids.length === 0) {
    return null;
  }
  return (
    <IconRow>
      {ids.map((id) => (
        <Icon key={id} src={characterPortraitUrl(id)} title={id} />
      ))}
    </IconRow>
  );
}

export function SuggestedAssignmentTable({
  board,
  assignment,
}: {
  board: ExpeditionBoardEntry[];
  assignment: BoardAssignmentResult;
}) {
  if (board.length === 0) {
    return null;
  }

  const sorted = sortByRarityDescending(board);

  return (
    <table className="mt-4 w-full table-auto border-collapse text-left">
      <thead>
        <tr>
          <th className={cellClass}>Alliance</th>
          <th className={cellClass}>Category</th>
          <th className={cellClass}>Rarity</th>
          <th className={cellClass}>
            <Icon src={deployIconUrl()} title="Participants" />
          </th>
          <th className={cellClass}>Required</th>
          <th className={cellClass}>Optional</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry) => {
          const dispatchedUnits = getDispatchedUnits(entry);
          const solution = assignment.get(entry.expeditionId);

          return (
            <tr key={entry.expeditionId}>
              <td className={cellClass}>
                <AllianceCell entry={entry} />
              </td>
              <td className={cellClass}>
                <Icon src={categoryIconUrl(entry)} />
              </td>
              <td className={cellClass}>
                <Icon src={entryRarityIconUrl(entry)} />
              </td>
              <td className={cellClass}>{entry.participants}</td>
              {dispatchedUnits ? (
                <td className={cellClass} colSpan={2}>
                  <IconRow>
                    {dispatchedUnits.map((unit) =>
                      unit.portraitUrl ? (
                        <Icon key={unit.unitId} src={unit.portraitUrl} title={unit.unitId} />
                      ) : (
                        <span key={unit.unitId}>{unit.unitId}</span>
                      ),
                    )}
                  </IconRow>
                </td>
              ) : (
                <>
                  <td className={cellClass}>
                    <PortraitList ids={solution?.run ? solution.requiredCharacterIds : []} />
                  </td>
                  <td className={cellClass}>
                    <PortraitList ids={solution?.run ? solution.optionalCharacterIds : []} />
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
