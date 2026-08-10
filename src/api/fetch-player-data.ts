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

  const board: ExpeditionBoardEntry[] | undefined =
    response?.eventResult?.eventResponseData?.player?.hero?.progress?.expeditions?.board;

  if (!board) {
    throw new Error("Fetched player data, but couldn't find an expeditions board in the response.");
  }

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
