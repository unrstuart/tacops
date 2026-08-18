import { Icon } from "./Icon";
import { watchAdIconUrl } from "../watch-ad-icon";
import { PVP_MAX } from "../api/resource-regen";
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

// Military time (no AM/PM, always 4 digits) plus date, since several of these resources regen
// slowly enough that "next"/"cap" routinely land on a different calendar day.
function formatDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const time = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function regenSubtext(nextTokenAt: number | null, capAt: number | null): string[] {
  return [
    nextTokenAt !== null ? `Next: ${formatDateTime(nextTokenAt)}` : null,
    capAt !== null ? `Cap: ${formatDateTime(capAt)}` : null,
  ].filter((line): line is string => line !== null);
}

export function ResourceTokens({ resources, adViewsRemaining }: ResourceTokensProps) {
  // Absent between PVP seasons - just omit the line rather than showing a misleading "0 / 0".
  const pvpPositionLine =
    resources.pvpPosition !== null && resources.pvpGroupSize !== null
      ? `${resources.pvpPosition} / ${resources.pvpGroupSize}`
      : null;
  // PVP's "next token" comes from the server's own staminaRegenUntil deadline, not computed
  // regen math - see computePvpTimings in resource-regen.ts for the three possible states.
  const pvpScheduleLines = resources.pvpStopped
    ? [`${resources.pvp}/${PVP_MAX} (no more regen)`]
    : [
        resources.pvpNextTokenAt !== null ? `Next: ${formatDateTime(resources.pvpNextTokenAt)}` : null,
        resources.pvpCapAt !== null
          ? `Cap: ${formatDateTime(resources.pvpCapAt)}`
          : resources.pvpPausesAt !== null
            ? `Pauses: ${formatDateTime(resources.pvpPausesAt)}`
            : null,
      ].filter((line): line is string => line !== null);
  const pvpSubtext = [pvpPositionLine, ...pvpScheduleLines].filter((line): line is string => line !== null);

  // Raid tokens (guild boss attempts) get burned at the next 09:45/22:45 UTC checkpoint if still
  // sitting at cap then - common when waiting for a raid target to open, so this is a deadline to
  // watch, not an error state.
  const guildBossSubtext = [
    ...regenSubtext(resources.guildBossNextTokenAt, resources.guildBossCapAt),
    resources.guildBossBurnAt !== null ? `Burn: ${formatDateTime(resources.guildBossBurnAt)}` : null,
  ].filter((line): line is string => line !== null);

  const entries: Array<{ key: string; label: string; icon: string; value: number | string; subtext?: string[] }> = [
    {
      key: "stamina",
      label: "Stamina",
      icon: staminaIconUrl(),
      value: resources.stamina,
      subtext: regenSubtext(resources.staminaNextTokenAt, resources.staminaCapAt),
    },
    // Written defensively rather than assuming adViewsRemaining is always set by the time this
    // renders - a genuine 0 must still show as 0, never silently hidden by a truthiness check.
    { key: "adViews", label: "Ad views remaining", icon: watchAdIconUrl(), value: adViewsRemaining === null ? "null" : adViewsRemaining },
    {
      key: "treasureBeach",
      label: "Treasure Beach",
      icon: treasureBeachIconUrl(),
      value: resources.treasureBeach,
      subtext: regenSubtext(resources.treasureBeachNextTokenAt, resources.treasureBeachCapAt),
    },
    {
      key: "waves",
      label: "Waves",
      icon: wavesIconUrl(),
      value: resources.waves,
      subtext: regenSubtext(resources.wavesNextTokenAt, resources.wavesCapAt),
    },
    { key: "pvp", label: "PVP", icon: pvpIconUrl(), value: resources.pvp, subtext: pvpSubtext },
    {
      key: "guildBoss",
      label: "Guild Boss",
      icon: guildBossIconUrl(),
      value: resources.guildBoss,
      subtext: guildBossSubtext,
    },
    {
      key: "guildBossBomb",
      label: "Guild Boss Bomb",
      icon: guildBossBombIconUrl(),
      value: resources.guildBossBomb,
      subtext: regenSubtext(resources.guildBossBombNextTokenAt, resources.guildBossBombCapAt),
    },
    { key: "mowAmmo", label: "Machines of War Ammo", icon: mowAmmoIconUrl(), value: resources.mowAmmo },
  ];

  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {entries.map((entry) => (
        <div key={entry.key} className="flex flex-col items-center gap-1">
          <Icon src={entry.icon} title={entry.label} />
          <span className="text-sm font-medium">{entry.value}</span>
          {entry.subtext?.map((line, i) => (
            <span key={i} className="text-xs text-neutral-500 dark:text-neutral-400">
              {line}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
