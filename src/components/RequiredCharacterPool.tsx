import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { characterPortraitUrl } from "../characters/character-portraits";
import type { BoardAssignmentResult } from "../board/board-solver";

export function RequiredCharacterPool({ assignment }: { assignment: BoardAssignmentResult }) {
  const requiredIds = new Set<string>();
  for (const solution of assignment.values()) {
    for (const id of solution.requiredCharacterIds) {
      requiredIds.add(id);
    }
  }

  if (requiredIds.size === 0) {
    return null;
  }

  return (
    <div className="mt-4 w-full text-left">
      <h3 className="font-medium">Required characters (reserved by the suggested solution)</h3>
      <IconRow>
        {[...requiredIds].map((id) => (
          <Icon key={id} src={characterPortraitUrl(id)} title={id} />
        ))}
      </IconRow>
    </div>
  );
}
