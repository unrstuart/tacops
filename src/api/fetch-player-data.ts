import { isTauri } from "@tauri-apps/api/core";
import { invokeWithTimeout } from "./invoke-with-timeout";
import { fetchWithTimeout } from "./fetch-with-timeout";
import characterData from "../assets/character-data.json";
import mowData from "../assets/mow-data.json";
import type { Credentials, Environment, ExpeditionBoardEntry, PlayerResources, RawUnit } from "./types";

const characterIds = new Set((characterData as { id: string }[]).map((c) => c.id));
const mowIds = new Set((mowData as { mows: { snowprintId: string }[] }).mows.map((m) => m.snowprintId));

export function isCharacterId(id: string): boolean {
  return characterIds.has(id);
}

export interface PlayerData {
  board: ExpeditionBoardEntry[];
  heroes: RawUnit[];
  machinesOfWar: RawUnit[];
  adViewsRemaining: number;
  resources: PlayerResources;
}

// webCredentials is only read on the web build - the desktop build auto-discovers credentials
// from the local Tacticus install instead (find_credentials), same as always.
export async function fetchPlayerData(
  environment: Environment,
  webCredentials?: { userId: string; clientSecret: string },
): Promise<PlayerData> {
  // Both transports replay 3 sequential requests server-side (APP_START -> CONNECT -> GET_PLAYER),
  // each individually bounded at 20s - so the outer timeout here needs enough room for all three
  // in the worst realistic case, not just one.
  const response = isTauri()
    ? await (async () => {
        const credentials = await invokeWithTimeout<Credentials>("find_credentials", { environment }, 20_000);
        return invokeWithTimeout<any>("fetch_player_data", { environment, ...credentials }, 60_000);
      })()
    : await fetchWithTimeout<any>(
        "/api/fetch-player-data",
        { environment, ...webCredentials, snowId: "" },
        60_000,
      );

  // The API omits the board entirely (rather than sending an empty array) when a player has no
  // expeditions queued and none in progress - e.g. right after claiming everything, before the
  // board refreshes with new offers. That's a legitimate state, not a fetch failure.
  const board: ExpeditionBoardEntry[] =
    response?.eventResult?.eventResponseData?.player?.hero?.progress?.expeditions?.board ?? [];

  const hero = response?.eventResult?.eventResponseData?.player?.hero;
  const units: RawUnit[] = Object.entries(hero?.units?.units ?? {}).map(([id, data]) => ({
    id,
    ...(data as object),
  }));

  // "currentAmount" is omitted entirely (rather than sent as 0) when a regenerating resource is
  // actually at 0, so every one of these needs a fallback rather than trusting the field's presence.
  const resources: PlayerResources = {
    stamina: hero?.stamina?.currentAmount ?? 0,
    treasureBeach: hero?.progress?.treasureBeach?.stamina?.currentAmount ?? 0,
    waves: hero?.progress?.waves?.stamina?.currentAmount ?? 0,
    pvp: hero?.progress?.pvpState?.stamina?.currentAmount ?? 0,
    // Absent between seasons - null (not 0) so the UI can tell "not currently ranked" apart from
    // an actual position/size of 0.
    pvpPosition: hero?.progress?.pvpState?.playerPosition ?? null,
    pvpGroupSize: hero?.progress?.pvpState?.actualGroupSize ?? null,
    guildBoss: hero?.progress?.guildState?.guildBoss?.attempts?.currentAmount ?? 0,
    guildBossBomb: hero?.progress?.guildState?.guildBoss?.bombAttempts?.currentAmount ?? 0,
    mowAmmo: hero?.resources?.groupedCurrencies?.global?.machinesOfWarAmmo ?? 0,
  };

  return {
    board,
    heroes: units.filter((u) => characterIds.has(u.id)),
    machinesOfWar: units.filter((u) => mowIds.has(u.id)),
    adViewsRemaining: hero?.player?.adViews?.currentAmount ?? 0,
    resources,
  };
}
