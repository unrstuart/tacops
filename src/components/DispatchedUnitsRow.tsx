import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { getDispatchedUnits, entryFinishAt } from "../board/board-view-model";
import { formatDateTime } from "../format-date-time";
import type { ExpeditionBoardEntry } from "../api/types";

export function DispatchedUnitsRow({ entry }: { entry: ExpeditionBoardEntry }) {
  const dispatchedUnits = getDispatchedUnits(entry);
  if (!dispatchedUnits) {
    return null;
  }
  const finishAt = entryFinishAt(entry);
  return (
    <div className="flex flex-col items-center gap-1">
      <IconRow>
        {dispatchedUnits.map((unit) =>
          unit.portraitUrl ? (
            <Icon key={unit.unitId} src={unit.portraitUrl} title={unit.unitId} />
          ) : (
            <span key={unit.unitId}>{unit.unitId}</span>
          ),
        )}
      </IconRow>
      {finishAt !== null && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Finishes: {formatDateTime(finishAt)}</span>
      )}
    </div>
  );
}
