import { Icon } from "./Icon";
import { IconRow } from "./IconRow";
import { characterPortraitUrl } from "../characters/character-portraits";

export function PortraitList({ ids }: { ids: string[] }) {
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
