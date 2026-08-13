import { Icon } from "./Icon";
import { watchAdIconUrl } from "../watch-ad-icon";
import {
  guildBossBombIconUrl,
  guildBossIconUrl,
  mowAmmoIconUrl,
  pvpIconUrl,
  staminaIconUrl,
  treasureBeachIconUrl,
  wavesIconUrl,
} from "../resource-icons";
import type { PlayerResources } from "../api/types";

interface ResourceTokensProps {
  resources: PlayerResources;
  adViewsRemaining: number | null;
}

export function ResourceTokens({ resources, adViewsRemaining }: ResourceTokensProps) {
  const entries: Array<{ key: string; label: string; icon: string; value: number | string }> = [
    { key: "stamina", label: "Stamina", icon: staminaIconUrl(), value: resources.stamina },
    // Written defensively rather than assuming adViewsRemaining is always set by the time this
    // renders - a genuine 0 must still show as 0, never silently hidden by a truthiness check.
    { key: "adViews", label: "Ad views remaining", icon: watchAdIconUrl(), value: adViewsRemaining === null ? "null" : adViewsRemaining },
    { key: "treasureBeach", label: "Treasure Beach", icon: treasureBeachIconUrl(), value: resources.treasureBeach },
    { key: "waves", label: "Waves", icon: wavesIconUrl(), value: resources.waves },
    { key: "pvp", label: "PVP", icon: pvpIconUrl(), value: resources.pvp },
    { key: "guildBoss", label: "Guild Boss", icon: guildBossIconUrl(), value: resources.guildBoss },
    { key: "guildBossBomb", label: "Guild Boss Bomb", icon: guildBossBombIconUrl(), value: resources.guildBossBomb },
    { key: "mowAmmo", label: "Machines of War Ammo", icon: mowAmmoIconUrl(), value: resources.mowAmmo },
  ];

  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {entries.map((entry) => (
        <div key={entry.key} className="flex flex-col items-center gap-1">
          <Icon src={entry.icon} title={entry.label} />
          <span className="text-sm font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
