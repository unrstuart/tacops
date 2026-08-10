import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { IconBadge } from "./IconBadge";
import { AllianceCell } from "./AllianceCell";
import { RewardsCell } from "./RewardsCell";
import { PortraitList } from "./PortraitList";
import { DispatchedUnitsRow } from "./DispatchedUnitsRow";
import {
  sortByRarityDescending,
  categoryIconUrl,
  entryRarityIconUrl,
  entryIsUnavailable,
  entryStatusLabel,
  getObjectiveDisplay,
} from "../board/board-view-model";
import { deployIconUrl } from "../board/deploy-icon";
import type { ExpeditionBoardEntry } from "../api/types";
import type { BoardAssignmentResult } from "../board/board-solver";

const cellClass = "border-b border-black/10 px-3 py-2 align-top dark:border-white/15";

export function OperationsTable({
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
    <table className="mt-4 w-full table-auto border-collapse text-left">
      <thead>
        <tr>
          <th className={cellClass}>Alliance</th>
          <th className={cellClass}>Category</th>
          <th className={cellClass}>Rarity</th>
          <th className={cellClass}>
            <Icon src={deployIconUrl()} title="Participants" />
          </th>
          <th className={cellClass}>Bonus Objectives</th>
          <th className={cellClass}>Base Rewards</th>
          <th className={cellClass}>Bonus Rewards</th>
          <th className={cellClass}>Status</th>
          <th className={cellClass}>Required</th>
          <th className={cellClass}>Optional</th>
          <th className={cellClass}>Dispatched</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry) => {
          const unavailable = entryIsUnavailable(entry);
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
              <td className={cellClass}>
                <IconRow>
                  {entry.bonusObjectives.map((o, i) => {
                    const display = getObjectiveDisplay(o);
                    if (display.badge === "no-ranged-attack" && display.iconUrl) {
                      return <IconBadge key={i} src={display.iconUrl} title={display.label} badgeText="✕" />;
                    }
                    return display.iconUrl ? (
                      <Icon key={i} src={display.iconUrl} title={display.label} />
                    ) : (
                      <span key={i}>{display.label}</span>
                    );
                  })}
                </IconRow>
              </td>
              <td className={cellClass}>
                <RewardsCell rewards={entry.baseRewards ?? []} />
              </td>
              <td className={cellClass}>
                <RewardsCell rewards={entry.bonusRewards ?? []} />
              </td>
              <td className={cellClass}>{entryStatusLabel(entry)}</td>
              <td className={cellClass}>
                {!unavailable && <PortraitList ids={solution?.run ? solution.requiredCharacterIds : []} />}
              </td>
              <td className={cellClass}>
                {!unavailable && <PortraitList ids={solution?.run ? solution.optionalCharacterIds : []} />}
              </td>
              <td className={cellClass}>{unavailable && <DispatchedUnitsRow entry={entry} />}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
