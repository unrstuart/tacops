import { useEffect, useMemo, useRef, useState } from "react";
import { EnvironmentToggle } from "./components/EnvironmentToggle";
import { ViewModeToggle, type ViewMode } from "./components/ViewModeToggle";
import { Tabs } from "./components/Tabs";
import { OperationsTable } from "./components/OperationsTable";
import { OperationsCards } from "./components/OperationsCards";
import { CharactersTable } from "./components/CharactersTable";
import { MowTable } from "./components/MowTable";
import { RewardPriorityPicker } from "./components/RewardPriorityPicker";
import { RequiredCharacterPool } from "./components/RequiredCharacterPool";
import { fetchPlayerData } from "./api/fetch-player-data";
import { solveBoardAssignment, type BoardAssignmentResult } from "./board/board-solver";
import type { ResourceKey } from "./board/reward-amount";
import type { Environment, ExpeditionBoardEntry, RawUnit } from "./api/types";

const TABS = [
  { id: "operations", label: "Operations" },
  { id: "characters", label: "Characters" },
  { id: "mows", label: "Machines of War" },
];

export function App() {
  const [environment, setEnvironment] = useState<Environment>("prod");
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string | null>(null);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const lastEightPressRef = useRef(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<ExpeditionBoardEntry[]>([]);
  const [heroes, setHeroes] = useState<RawUnit[]>([]);
  const [machinesOfWar, setMachinesOfWar] = useState<RawUnit[]>([]);
  const [priorityOrder, setPriorityOrder] = useState<[ResourceKey, ResourceKey, ResourceKey]>([
    "crusadeBomb",
    "intel",
    "crusadeNpc",
  ]);

  const { assignment, solverError } = useMemo((): { assignment: BoardAssignmentResult; solverError?: string } => {
    if (board.length === 0 || heroes.length === 0) {
      return { assignment: new Map() };
    }
    try {
      return { assignment: solveBoardAssignment(board, heroes, priorityOrder) };
    } catch (error) {
      return { assignment: new Map(), solverError: `${error}` };
    }
  }, [board, heroes, priorityOrder]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedExpeditionId(null);
        return;
      }
      if (e.key !== "8" || e.repeat) return;
      const now = Date.now();
      if (now - lastEightPressRef.current < 400) return;
      lastEightPressRef.current = now;
      setDevModeEnabled((current) => {
        const next = !current;
        if (!next) {
          setViewMode("cards");
          setActiveTab("operations");
        }
        return next;
      });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleSelection(expeditionId: string) {
    setSelectedExpeditionId((current) => (current === expeditionId ? null : expeditionId));
  }

  async function go() {
    setLoading(true);
    setBoard([]);
    try {
      setStatus("Reading local credentials...");
      setStatus("Fetching player data...");
      const data = await fetchPlayerData(environment);
      setStatus(
        data.board.length === 0
          ? "Couldn't find any expeditions. Have you refreshed your board after claiming your completed operations?"
          : `Loaded ${data.board.length} expedition(s), ${data.heroes.length} hero(es), ${data.machinesOfWar.length} machine(s) of war.`,
      );
      setBoard(data.board);
      setHeroes(data.heroes);
      setMachinesOfWar(data.machinesOfWar);
    } catch (error) {
      setStatus(`Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      onClick={() => setSelectedExpeditionId(null)}
      className="mx-auto flex min-h-screen w-full flex-col items-center bg-neutral-100 px-4 py-[5vh] text-center text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
    >
      <h1 className="text-2xl font-semibold">TacOps by cpunerd (Kharnage)</h1>
      <p>Reads your local Tacticus credentials, fetches your live account data, and shows your current expeditions board.</p>

      {devModeEnabled && <EnvironmentToggle value={environment} onChange={setEnvironment} />}
      {devModeEnabled && <ViewModeToggle value={viewMode} onChange={setViewMode} />}

      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="rounded-lg border border-transparent bg-white px-5 py-2.5 font-medium text-neutral-900 shadow-[0_2px_2px_rgba(0,0,0,0.2)] outline-none transition-colors hover:border-blue-500 active:border-blue-500 active:bg-neutral-100 disabled:cursor-default disabled:opacity-60 dark:bg-neutral-900/60 dark:text-white dark:active:bg-neutral-900/40"
      >
        GO
      </button>
      <p>{status}</p>

      {devModeEnabled && <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />}

      <div className="w-full overflow-x-auto pt-2">
        {activeTab === "operations" && (
          <>
            {board.length > 0 && (
              <>
                <RewardPriorityPicker value={priorityOrder} onChange={setPriorityOrder} />
                {solverError && (
                  <p className="mt-2 text-red-600 dark:text-red-400">
                    Couldn't compute a suggested assignment: {solverError}
                  </p>
                )}
                <RequiredCharacterPool assignment={assignment} />
              </>
            )}
            {viewMode === "table" ? (
              <OperationsTable
                board={board}
                assignment={assignment}
                selectedExpeditionId={selectedExpeditionId}
                onSelect={toggleSelection}
              />
            ) : (
              <OperationsCards
                board={board}
                assignment={assignment}
                selectedExpeditionId={selectedExpeditionId}
                onSelect={toggleSelection}
              />
            )}
          </>
        )}
        {activeTab === "characters" && <CharactersTable heroes={heroes} />}
        {activeTab === "mows" && <MowTable machinesOfWar={machinesOfWar} />}
      </div>
    </main>
  );
}
