import { invoke } from "@tauri-apps/api/core";
import characterData from "../assets/character-data.json";
import mowData from "../assets/mow-data.json";
import type { Credentials, Environment, ExpeditionBoardEntry, RawUnit } from "./types";

const characterIds = new Set((characterData as { id: string }[]).map((c) => c.id));
const mowIds = new Set((mowData as { mows: { snowprintId: string }[] }).mows.map((m) => m.snowprintId));

export function isCharacterId(id: string): boolean {
  return characterIds.has(id);
}

export interface PlayerData {
  board: ExpeditionBoardEntry[];
  heroes: RawUnit[];
  machinesOfWar: RawUnit[];
}

export async function fetchPlayerData(environment: Environment): Promise<PlayerData> {
  const credentials = await invoke<Credentials>("find_credentials", { environment });
  const response = await invoke<any>("fetch_player_data", { environment, ...credentials });

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

  return {
    board,
    heroes: units.filter((u) => characterIds.has(u.id)),
    machinesOfWar: units.filter((u) => mowIds.has(u.id)),
  };
}
