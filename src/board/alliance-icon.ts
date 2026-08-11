const ALLIANCE_ICON_FILE: Record<string, string> = {
  Imperial: "ui_icons_quest_expedition_frame_imperial.png",
  Xenos: "ui_icons_quest_expedition_frame_xenos.png",
  Chaos: "ui_icons_quest_expedition_frame_chaos.png",
};

const NEUTRAL_ICON_FILE = "ui_icons_quest_expedition_frame_neutral.png";

export function allianceIconUrl(alliance: string | undefined): string {
  const file = alliance ? ALLIANCE_ICON_FILE[alliance] : undefined;
  if (alliance && !file) {
    throw new Error(`Unknown alliance: ${alliance}`);
  }
  return new URL(`../assets/alliances/${file ?? NEUTRAL_ICON_FILE}`, import.meta.url).href;
}
