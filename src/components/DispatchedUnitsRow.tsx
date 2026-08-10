import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { getDispatchedUnits } from "../board/board-view-model";
import type { ExpeditionBoardEntry } from "../api/types";

export function DispatchedUnitsRow({ entry }: { entry: ExpeditionBoardEntry }) {
  const dispatchedUnits = getDispatchedUnits(entry);
  if (!dispatchedUnits) {
    return null;
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
