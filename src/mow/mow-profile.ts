import mowData from "../assets/mow-data.json";

interface MowData {
  snowprintId: string;
  name: string;
  faction: string;
  alliance: string;
  roundIcon: string;
}

const mowById = new Map((mowData as { mows: MowData[] }).mows.map((m) => [m.snowprintId, m]));

export interface MowProfile {
  name: string;
  faction: string;
  alliance: string;
  portraitFile: string;
}

export function getMowProfile(mowId: string): MowProfile {
  const mow = mowById.get(mowId);
  if (!mow) {
    throw new Error(`Unknown machine of war id: ${mowId}`);
  }

  return {
    name: mow.name,
    faction: mow.faction,
    alliance: mow.alliance,
    portraitFile: mow.roundIcon.split("/").pop() as string,
  };
}

export function mowPortraitUrl(portraitFile: string): string {
  return new URL(`../assets/portraits/${portraitFile}`, import.meta.url).href;
}
