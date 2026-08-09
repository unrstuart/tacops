import { Rarity } from "./rarity.enum";

export function rarityIconUrl(rarity: Rarity): string {
  const name = Rarity[rarity].toLowerCase();
  return new URL(`../assets/rarity/${name}.png`, import.meta.url).href;
}
