export function requiredAlliance(category: string): string | undefined {
  const prefix = category.split("_")[0];
  switch (prefix) {
    case "imp":
      return "Imperial";
    case "xenos":
      return "Xenos";
    case "chaos":
      return "Chaos";
    case "all":
      return undefined;
    default:
      throw new Error(`Unknown alliance prefix in category "${category}"`);
  }
}
