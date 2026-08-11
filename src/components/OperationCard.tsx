import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { IconBadge } from "./IconBadge";
import { RewardsCell } from "./RewardsCell";
import { PortraitList } from "./PortraitList";
import { DispatchedUnitsRow } from "./DispatchedUnitsRow";
import { OpsCardFrame } from "./OpsCardFrame";
import { getObjectiveDisplay, entryIsUnavailable, entryStatusLabel } from "../board/board-view-model";
import type { Environment, ExpeditionBoardEntry } from "../api/types";
import type { BoardAssignmentResult } from "../board/board-solver";

export function OperationCard({
  entry,
  environment,
  assignment,
  selectedExpeditionId,
  onSelect,
}: {
  entry: ExpeditionBoardEntry;
  environment: Environment;
  assignment: BoardAssignmentResult;
  selectedExpeditionId: string | null;
  onSelect: (expeditionId: string) => void;
}) {
  const unavailable = entryIsUnavailable(entry);
  const solution = assignment.get(entry.expeditionId);
  const dimmed = selectedExpeditionId !== null && selectedExpeditionId !== entry.expeditionId;

  return (
    <OpsCardFrame
      entry={entry}
      environment={environment}
      corner={entryStatusLabel(entry)}
      dimmed={dimmed}
      onClick={() => onSelect(entry.expeditionId)}
    >
      <div className="flex justify-end">
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
      </div>
      <div className="flex items-center justify-between gap-2">
        <RewardsCell rewards={entry.baseRewards ?? []} />
        <RewardsCell rewards={entry.bonusRewards ?? []} />
      </div>
      {unavailable ? (
        <DispatchedUnitsRow entry={entry} />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">Required</span>
            <PortraitList ids={solution?.run ? solution.requiredCharacterIds : []} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium opacity-70">Optional</span>
            <PortraitList ids={solution?.run ? solution.optionalCharacterIds : []} />
          </div>
        </div>
      )}
    </OpsCardFrame>
  );
}
