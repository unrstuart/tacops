const cellClass = "border-b border-black/10 px-3 py-2 align-top dark:border-white/15";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface GenericTableProps {
  items: Record<string, unknown>[];
  emptyMessage: string;
}

export function GenericTable({ items, emptyMessage }: GenericTableProps) {
  if (items.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  const keySet = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) keySet.add(key);
  }
  const keys = ["id", ...Array.from(keySet).filter((key) => key !== "id")];

  return (
    <table className="mt-4 w-full table-auto border-collapse text-left">
      <thead>
        <tr>
          {keys.map((key) => (
            <th key={key} className={cellClass}>
              {key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            {keys.map((key) => (
              <td key={key} className={cellClass}>
                {formatValue(item[key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
