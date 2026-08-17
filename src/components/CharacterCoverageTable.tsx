import { useState } from "react";
import { CoverageDetailModal } from "./CoverageDetailModal";
import { getCharacterDetailRows, type CoverageFilters } from "../coverage/coverage-view-model";
import type { CharacterCatalogEntry } from "../coverage/coverage-solver";

const cellClass = "border-b border-black/10 px-3 py-2 align-top dark:border-white/15";

interface CharacterCoverageTableProps {
  catalog: CharacterCatalogEntry[];
  counts: number[]; // index-aligned with catalog
  filters: CoverageFilters;
  minCoverFlat: Uint8Array;
  characterCount: number;
}

export function CharacterCoverageTable({
  catalog,
  counts,
  filters,
  minCoverFlat,
  characterCount,
}: CharacterCoverageTableProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const rows = catalog
    .map((entry, index) => ({ ...entry, index, count: counts[index] ?? 0 }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const selected = selectedIndex === null ? undefined : rows.find((row) => row.index === selectedIndex);

  return (
    <>
      <table className="mt-4 w-full table-auto border-collapse text-left">
        <thead>
          <tr>
            <th className={cellClass}>Character</th>
            <th className={cellClass}>Usable Boards</th>
            <th className={cellClass}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={cellClass}>{row.name}</td>
              <td className={cellClass}>{row.count.toLocaleString()}</td>
              <td className={cellClass}>
                <button
                  type="button"
                  className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => setSelectedIndex(row.index)}
                >
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <CoverageDetailModal
          characterName={selected.name}
          rows={getCharacterDetailRows(selected.index, filters, minCoverFlat, characterCount)}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}
