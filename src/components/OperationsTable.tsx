import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { IconBadge } from "./IconBadge";
import {
  sortByRarityDescending,
  categoryIconUrl,
  entryAllianceIconUrl,
  entryRarityIconUrl,
  getObjectiveDisplay,
  getRewardChips,
  getDispatchedUnits,
} from "../board/board-view-model";
import { deployIconUrl } from "../board/deploy-icon";
import type { ExpeditionBoardEntry } from "../api/types";

const cellClass = "border-b border-black/10 px-3 py-2 align-top dark:border-white/15";

function RewardsCell({ rewards }: { rewards: string[] }) {
  return (
    <IconRow>
      {getRewardChips(rewards).map((chip, i) =>
        chip.iconUrl ? (
          <span key={i} className="inline-flex items-center gap-0.5">
            <Icon src={chip.iconUrl} />x{chip.amount}
          </span>
        ) : (
          <span key={i}>{chip.label}</span>
        ),
      )}
    </IconRow>
  );
}

function AllianceCell({ entry }: { entry: ExpeditionBoardEntry }) {
  const iconUrl = entryAllianceIconUrl(entry);
  return iconUrl ? <Icon src={iconUrl} /> : null;
}

function StatusCell({ entry }: { entry: ExpeditionBoardEntry }) {
  const dispatchedUnits = getDispatchedUnits(entry);
  if (!dispatchedUnits) {
    return <>{entry.status}</>;
  }
  return (
    <IconRow>
      {dispatchedUnits.map((unit) =>
        unit.portraitUrl ? (
          <Icon key={unit.unitId} src={unit.portraitUrl} title={unit.unitId} />
        ) : (
          <span key={unit.unitId}>{unit.unitId}</span>
        ),
      )}
    </IconRow>
  );
}

export function OperationsTable({ board }: { board: ExpeditionBoardEntry[] }) {
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
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry) => (
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
            <td className={cellClass}>
              <StatusCell entry={entry} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
