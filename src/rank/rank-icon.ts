import { Rank } from "./rank.enum";

export function rankIconUrl(rank: Rank): string {
  const name = Rank[rank].toLowerCase();
  return new URL(`../assets/ranks/${name}.png`, import.meta.url).href;
}
