const REWARD_ICON_FILE: Record<string, string> = {
  crusadeBomb: "ui_icon_resource_crusade_bomb_large.png",
  intel: "ui_icon_resource_crusade_intel_large.png",
  crusadeNpc: "ui_icon_resource_crusade_npc_large.png",
};

const XP_ICON: Record<string, string> = {
  xp_crusadePoints: new URL("../assets/xp/crusades.png", import.meta.url).href,
  xp_expeditionPoints: new URL("../assets/xp/expeditions.png", import.meta.url).href,
};

export function rewardIconUrl(key: string): string | undefined {
  const resourceFile = REWARD_ICON_FILE[key];
  if (resourceFile) {
    return new URL(`../assets/resources/${resourceFile}`, import.meta.url).href;
  }
  return XP_ICON[key];
}
