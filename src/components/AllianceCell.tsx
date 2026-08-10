import { Icon } from "./Icon";
import { entryAllianceIconUrl } from "../board/board-view-model";
import type { ExpeditionBoardEntry } from "../api/types";

export function AllianceCell({ entry }: { entry: ExpeditionBoardEntry }) {
  const iconUrl = entryAllianceIconUrl(entry);
  return iconUrl ? <Icon src={iconUrl} /> : null;
}
