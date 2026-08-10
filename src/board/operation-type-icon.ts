export function operationTypeIconUrl(category: string): string {
  return new URL(`../assets/operations_types/ui_icons_quest_expedition_type_${category}.png`, import.meta.url).href;
}
