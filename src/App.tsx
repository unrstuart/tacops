import { useState } from "react";
import { EnvironmentToggle } from "./components/EnvironmentToggle";
import { Tabs } from "./components/Tabs";
import { OperationsTable } from "./components/OperationsTable";
import { CharactersTable } from "./components/CharactersTable";
import { GenericTable } from "./components/GenericTable";
import { fetchPlayerData } from "./api/fetch-player-data";
import type { Environment, ExpeditionBoardEntry, RawUnit } from "./api/types";

const TABS = [
  { id: "operations", label: "Operations" },
  { id: "characters", label: "Characters" },
  { id: "mows", label: "Machines of War" },
];

export function App() {
  const [environment, setEnvironment] = useState<Environment>("prod");
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<ExpeditionBoardEntry[]>([]);
  const [heroes, setHeroes] = useState<RawUnit[]>([]);
  const [machinesOfWar, setMachinesOfWar] = useState<RawUnit[]>([]);

  async function go() {
    setLoading(true);
    setBoard([]);
    try {
      setStatus("Reading local credentials...");
      setStatus("Fetching player data...");
      const data = await fetchPlayerData(environment);
      setStatus(
        `Loaded ${data.board.length} expedition(s), ${data.heroes.length} hero(es), ${data.machinesOfWar.length} machine(s) of war.`,
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
    <main className="mx-auto flex min-h-screen w-full min-w-[900px] flex-col items-center bg-neutral-100 px-4 py-[5vh] text-center text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
      <h1 className="text-2xl font-semibold">TacOps</h1>
      <p>Reads your local Tacticus credentials, fetches your live account data, and shows your current expeditions board.</p>

      <EnvironmentToggle value={environment} onChange={setEnvironment} />

      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="rounded-lg border border-transparent bg-white px-5 py-2.5 font-medium text-neutral-900 shadow-[0_2px_2px_rgba(0,0,0,0.2)] outline-none transition-colors hover:border-blue-500 active:border-blue-500 active:bg-neutral-100 disabled:cursor-default disabled:opacity-60 dark:bg-neutral-900/60 dark:text-white dark:active:bg-neutral-900/40"
      >
        GO
      </button>
      <p>{status}</p>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="w-full overflow-x-auto pt-2">
        {activeTab === "operations" && <OperationsTable board={board} />}
        {activeTab === "characters" && <CharactersTable heroes={heroes} />}
        {activeTab === "mows" && <GenericTable items={machinesOfWar} emptyMessage="No machines of war found." />}
      </div>
    </main>
  );
}
