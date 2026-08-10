import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { getRewardChips } from "../board/board-view-model";

export function RewardsCell({ rewards }: { rewards: string[] }) {
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
