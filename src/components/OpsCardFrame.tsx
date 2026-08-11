import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { AllianceCategoryBadge } from "./AllianceCategoryBadge";
import { entryRarityIconUrl } from "../board/board-view-model";
import { deployIconUrl } from "../board/deploy-icon";
import type { ExpeditionBoardEntry } from "../api/types";

interface OpsCardFrameProps {
  entry: ExpeditionBoardEntry;
  children: ReactNode;
  corner: ReactNode;
}

export function OpsCardFrame({ entry, children, corner }: OpsCardFrameProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-3 text-left shadow-sm dark:border-white/15 dark:bg-neutral-900/40">
      <IconRow>
        <AllianceCategoryBadge entry={entry} />
        <Icon src={entryRarityIconUrl(entry)} />
      </IconRow>
      <div className="flex flex-col gap-2">{children}</div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="inline-flex items-center gap-1">
          <Icon src={deployIconUrl()} title="Participants" />
          {entry.participants}
        </span>
        {corner}
      </div>
    </div>
  );
}
