export function damageProfileIconUrl(damageProfile: string): string {
  return new URL(`../assets/pierce/ui_icon_damage_profile2_${damageProfile}.png`, import.meta.url).href;
}
