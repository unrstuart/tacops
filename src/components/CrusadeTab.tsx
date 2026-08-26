import { Icon } from "./Icon";
import { Spinner } from "./Spinner";
import { factionIconUrl } from "../factions/faction-icon";
import type { CrusadeData, FactionLeaderboardResult, PlanetLeaderboard, SideLeaderboardResult } from "../api/types";

const cellClass = "border-b border-black/10 px-3 py-2 align-top dark:border-white/15";

interface CrusadeTabProps {
  crusadeData: CrusadeData | null;
  planetLeaderboards: PlanetLeaderboard[];
  error: string | null;
  loadingProgress: { done: number; total: number; phase: "side" | "faction" } | null;
}

function FactionBadge({ factionId }: { factionId: string }) {
  const url = factionIconUrl(factionId);
  return url ? <Icon src={url} title={factionId} /> : <span>{factionId}</span>;
}

// Whole-number percent split, Imperium (for) always first - it's the number that matters when
// deciding whether to move to a planet. "-" when there's nothing to split yet (both 0/absent).
function SidePercentCell({ pointsFor, pointsAgainst }: { pointsFor?: number; pointsAgainst?: number }) {
  const total = (pointsFor ?? 0) + (pointsAgainst ?? 0);
  if (total === 0) return <span>-</span>;
  const forPct = Math.round(((pointsFor ?? 0) / total) * 100);
  return (
    <span>
      {forPct}% / {100 - forPct}%
    </span>
  );
}

function percentileLabel(rank: number, numParticipants: number): string {
  return `top ${((rank / numParticipants) * 100).toFixed(1)}%`;
}

// Shared by both the Side and Faction Leaderboard columns - identical shape (numParticipants,
// myRank, myPoints, benchmarks), identical rendering rules. Blank entirely when there's no
// leaderboard entry at all for this planet (a missing/wrong-prefix response, or - for the side
// leaderboard specifically - neither side having any entry) - not the same as "no personal rank",
// which still renders benchmarks (myRank === null below).
function LeaderboardBreakdownCell({ result }: { result: SideLeaderboardResult | FactionLeaderboardResult | null }) {
  if (!result) return null;
  // Rank-ascending (#1 first, #25 last) - the "You" row's sort key is the player's actual rank,
  // so it lands in its correct numeric position among the benchmarks (e.g. between #10 and #25).
  const rows: { label: string; rank: number; points: number; isMe: boolean }[] = [
    ...result.benchmarks.map((b) => ({ label: `#${b.rank}`, rank: b.rank, points: b.points, isMe: false })),
    ...(result.myRank !== null && result.myPoints !== null
      ? [{ label: `You (#${result.myRank})`, rank: result.myRank, points: result.myPoints, isMe: true }]
      : []),
  ].sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex flex-col gap-0.5">
      {result.myRank !== null && (
        <>
          <span>
            #{result.myRank} / {result.numParticipants.toLocaleString()}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">{percentileLabel(result.myRank, result.numParticipants)}</span>
        </>
      )}
      {rows.map((row) => (
        <span key={row.label} className={row.isMe ? "font-semibold text-blue-600 dark:text-blue-400" : "text-neutral-500 dark:text-neutral-400"}>
          {row.label}: {row.points.toLocaleString()}
        </span>
      ))}
    </div>
  );
}

export function CrusadeTab({ crusadeData, planetLeaderboards, error, loadingProgress }: CrusadeTabProps) {
  if (!crusadeData) {
    return error ? (
      <pre className="mt-4 w-full overflow-x-auto whitespace-pre-wrap rounded border border-red-400 bg-red-50 p-3 text-left text-sm text-red-700 dark:border-red-600 dark:bg-red-950/40 dark:text-red-400">
        {error}
      </pre>
    ) : (
      <p>No crusade data loaded.</p>
    );
  }
  if (crusadeData.activeZone === null) {
    return <p>No crusade zone is currently active (between phases).</p>;
  }

  const leaderboardByPlanet = new Map(planetLeaderboards.map((l) => [l.planetId, l]));
  const activePlanets = crusadeData.planets.filter((p) => leaderboardByPlanet.has(p.planetId));

  if (activePlanets.length === 0) {
    return loadingProgress ? (
      <p className="inline-flex items-center gap-2">
        <Spinner />
        {loadingProgress.phase === "side" ? "Loading crusade data..." : "Loading faction rankings..."}{" "}
        {loadingProgress.done}/{loadingProgress.total} planets
      </p>
    ) : (
      <p>No active-zone planet data loaded yet.</p>
    );
  }

  return (
    <table className="mt-4 w-full table-auto border-collapse text-left">
      <thead>
        <tr>
          <th className={cellClass}>Planet</th>
          <th className={cellClass}>Imperium % / Devastation %</th>
          <th className={cellClass}>Leading Factions (Imperium)</th>
          <th className={cellClass}>Leading Factions (Devastation)</th>
          <th className={cellClass}>Side Leaderboard</th>
          <th className={cellClass}>Faction Leaderboard</th>
        </tr>
      </thead>
      <tbody>
        {activePlanets.map((planet) => {
          const lb = leaderboardByPlanet.get(planet.planetId)!;
          return (
            <tr key={planet.planetId}>
              <td className={cellClass}>{planet.name}</td>
              <td className={cellClass}>
                <SidePercentCell pointsFor={planet.pointsFor} pointsAgainst={planet.pointsAgainst} />
              </td>
              <td className={cellClass}>
                {lb.topFactionsFor.slice(0, 3).map((f) => (
                  <div key={f.factionId} className="flex items-center gap-1">
                    <FactionBadge factionId={f.factionId} />
                    <span>{f.points.toLocaleString()}</span>
                  </div>
                ))}
              </td>
              <td className={cellClass}>
                {lb.topFactionsAgainst.slice(0, 3).map((f) => (
                  <div key={f.factionId} className="flex items-center gap-1">
                    <FactionBadge factionId={f.factionId} />
                    <span>{f.points.toLocaleString()}</span>
                  </div>
                ))}
              </td>
              <td className={cellClass}>
                <LeaderboardBreakdownCell result={lb.side} />
              </td>
              <td className={cellClass}>
                <LeaderboardBreakdownCell result={lb.faction} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
