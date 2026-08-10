const ALLIANCE_ICON_FILE: Record<string, string> = {
  Imperial: "alliance_imperial.png",
  Xenos: "alliance_xenos.png",
  Chaos: "alliance_chaos.png",
};

export function allianceIconUrl(alliance: string): string {
  const file = ALLIANCE_ICON_FILE[alliance];
  if (!file) {
    throw new Error(`Unknown alliance: ${alliance}`);
  }
  return new URL(`../assets/alliances/${file}`, import.meta.url).href;
}
