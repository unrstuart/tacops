import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Spinner } from "./components/Spinner";
import { ErrorIcon } from "./components/ErrorIcon";
import { EnvironmentToggle } from "./components/EnvironmentToggle";
import { ViewModeToggle, type ViewMode } from "./components/ViewModeToggle";
import { Tabs } from "./components/Tabs";
import { OperationsTable } from "./components/OperationsTable";
import { OperationsCards } from "./components/OperationsCards";
import { CharactersTable } from "./components/CharactersTable";
import { MowTable } from "./components/MowTable";
import { RewardPriorityPicker } from "./components/RewardPriorityPicker";
import { RequiredCharacterPool } from "./components/RequiredCharacterPool";
import { ResourceTokens } from "./components/ResourceTokens";
import { fetchPlayerData } from "./api/fetch-player-data";
import { storeWebCredential } from "./api/store-web-credential";
import type { BoardAssignmentResult } from "./board/board-solver";
import type { SolveRequest, SolveResponse } from "./board/board-solver.worker";
import type { ResourceKey } from "./board/reward-amount";
import type { Environment, ExpeditionBoardEntry, PlayerResources, RawUnit } from "./api/types";

const TABS = [
  { id: "operations", label: "Operations" },
  { id: "characters", label: "Characters" },
  { id: "mows", label: "Machines of War" },
];

const FETCH_COUNTDOWN_SECONDS = 60;
const SOLVER_COUNTDOWN_SECONDS = 60; // 6 lexicographic passes x the 10s-per-pass solver timeout

export function App() {
  const [environment, setEnvironment] = useState<Environment>("prod");
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string | null>(null);
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const lastEightPressRef = useRef(0);
  const [userId, setUserId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [status, setStatus] = useState("");
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [secondsRemaining, setSecondsRemaining] = useState(FETCH_COUNTDOWN_SECONDS);
  const [board, setBoard] = useState<ExpeditionBoardEntry[]>([]);
  const [heroes, setHeroes] = useState<RawUnit[]>([]);
  const [machinesOfWar, setMachinesOfWar] = useState<RawUnit[]>([]);
  const [adViewsRemaining, setAdViewsRemaining] = useState<number | null>(null);
  const [resources, setResources] = useState<PlayerResources | null>(null);
  const [priorityOrder, setPriorityOrder] = useState<[ResourceKey, ResourceKey, ResourceKey]>([
    "crusadeBomb",
    "intel",
    "crusadeNpc",
  ]);

  const [solverState, setSolverState] = useState<"idle" | "solving" | "success" | "error">("idle");
  const [solverSecondsRemaining, setSolverSecondsRemaining] = useState(SOLVER_COUNTDOWN_SECONDS);
  const [assignment, setAssignment] = useState<BoardAssignmentResult>(new Map());
  const [solverError, setSolverError] = useState<string>();
  const [solverDegradedReason, setSolverDegradedReason] = useState<string>();
  const [solverFailedReason, setSolverFailedReason] = useState<string>();
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Terminate any worker still running on unmount (e.g. hot-reload in dev).
  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  // The solver runs entirely in a Web Worker (javascript-lp-solver is synchronous with no
  // async/worker mode of its own) so it can never block the main thread - the board renders
  // immediately from fetched data, and this fills in the suggested assignment once it's ready.
  // Terminating and recreating the worker on every change (rather than queuing) guarantees a
  // priority-order change doesn't have to wait behind a slow, now-stale solve.
  useEffect(() => {
    if (board.length === 0 || heroes.length === 0) {
      workerRef.current?.terminate();
      setAssignment(new Map());
      setSolverState("idle");
      setSolverError(undefined);
      setSolverDegradedReason(undefined);
      setSolverFailedReason(undefined);
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    workerRef.current?.terminate();
    const worker = new Worker(new URL("./board/board-solver.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SolveResponse>) => {
      if (event.data.requestId !== requestIdRef.current) return; // stale response, ignore
      if (event.data.status === "success") {
        setAssignment(new Map(event.data.assignmentEntries));
        setSolverDegradedReason(event.data.solveStatus === "degraded" ? event.data.message : undefined);
        setSolverFailedReason(event.data.solveStatus === "failed" ? event.data.message : undefined);
        setSolverError(undefined);
        setSolverState("success");
      } else {
        setSolverError(event.data.error);
        setSolverDegradedReason(undefined);
        setSolverFailedReason(undefined);
        setSolverState("error");
      }
    };

    setSolverState("solving");
    setSolverError(undefined);
    setSolverDegradedReason(undefined);
    setSolverFailedReason(undefined);
    const request: SolveRequest = { requestId, board, heroes, priorityOrder };
    worker.postMessage(request);
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

  // Purely a visual "roughly how long this could take" indicator - actual enforcement is via the
  // RPC timeouts in fetchPlayerData, not this countdown.
  useEffect(() => {
    if (fetchState !== "loading") return;
    setSecondsRemaining(FETCH_COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Same purely-visual purpose as the fetch countdown above - actual enforcement is the
  // solver's own per-pass timeout in board-solver.ts.
  useEffect(() => {
    if (solverState !== "solving") return;
    setSolverSecondsRemaining(SOLVER_COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSolverSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [solverState]);

  function toggleSelection(expeditionId: string) {
    setSelectedExpeditionId((current) => (current === expeditionId ? null : expeditionId));
  }

  async function go() {
    setFetchState("loading");
    setBoard([]);
    try {
      setStatus("Reading local credentials...");
      setStatus("Fetching player data...");
      const data = await fetchPlayerData(environment, { userId, clientSecret });
      setStatus(
        data.board.length === 0
          ? "Couldn't find any expeditions. Have you refreshed your board after claiming your completed operations?"
          : `Loaded ${data.board.length} expedition(s), ${data.heroes.length} hero(es), ${data.machinesOfWar.length} machine(s) of war.`,
      );
      setBoard(data.board);
      setHeroes(data.heroes);
      setMachinesOfWar(data.machinesOfWar);
      setAdViewsRemaining(data.adViewsRemaining);
      setResources(data.resources);
      setFetchState("success");
      if (!isTauri()) void storeWebCredential(userId, clientSecret);
    } catch (error) {
      console.error("[App] go(): caught error", error);
      setStatus(`Failed: ${error}`);
      setFetchState("error");
    }
  }

  return (
    <main
      onClick={() => setSelectedExpeditionId(null)}
      className="mx-auto flex min-h-screen w-full flex-col items-center bg-neutral-100 px-4 py-[5vh] text-center text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
    >
      <h1 className="text-2xl font-semibold">TacOps by cpunerd (Kharnage)</h1>
      <p>
        {isTauri()
          ? "Reads your local Tacticus credentials, fetches your live account data, and shows your current expeditions board."
          : "Enter your Tacticus user ID and client secret to fetch your live account data and show your current expeditions board. Nothing you enter here is stored - only your browser remembers it, if you let it."}
      </p>

      {devModeEnabled && <EnvironmentToggle value={environment} onChange={setEnvironment} />}
      {devModeEnabled && <ViewModeToggle value={viewMode} onChange={setViewMode} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex flex-col items-center gap-2"
      >
        {!isTauri() && (
          <>
            <input
              type="text"
              name="userId"
              autoComplete="username"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-900/60 dark:text-white"
            />
            <div className="relative w-64">
              <input
                type={showClientSecret ? "text" : "password"}
                name="clientSecret"
                autoComplete="current-password"
                placeholder="Client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-14 text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-900/60 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowClientSecret((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {showClientSecret ? "Hide" : "Show"}
              </button>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={fetchState === "loading"}
          className="rounded-lg border border-transparent bg-white px-5 py-2.5 font-medium text-neutral-900 shadow-[0_2px_2px_rgba(0,0,0,0.2)] outline-none transition-colors hover:border-blue-500 active:border-blue-500 active:bg-neutral-100 disabled:cursor-default disabled:opacity-60 dark:bg-neutral-900/60 dark:text-white dark:active:bg-neutral-900/40"
        >
          GO
        </button>
      </form>
      {resources && <ResourceTokens resources={resources} adViewsRemaining={adViewsRemaining} />}
      <p className="inline-flex items-center gap-2">
        {fetchState === "loading" && <Spinner seconds={secondsRemaining} />}
        {fetchState === "error" && <ErrorIcon />}
        {status}
      </p>

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
                {solverFailedReason && (
                  <p className="mt-2 text-red-600 dark:text-red-400">{solverFailedReason}</p>
                )}
                {solverDegradedReason && (
                  <p className="mt-2 text-amber-600 dark:text-amber-400">{solverDegradedReason}</p>
                )}
                <RequiredCharacterPool assignment={assignment} />
              </>
            )}
            <div className="relative w-full">
              {solverState === "solving" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/70 dark:bg-neutral-900/70">
                  <p className="font-medium">Solving</p>
                  <Spinner size={64} seconds={solverSecondsRemaining} />
                </div>
              )}
              <div className={solverState === "solving" ? "pointer-events-none" : ""}>
                {viewMode === "table" ? (
                  <OperationsTable
                    board={board}
                    environment={environment}
                    assignment={assignment}
                    selectedExpeditionId={selectedExpeditionId}
                    onSelect={toggleSelection}
                  />
                ) : (
                  <OperationsCards
                    board={board}
                    environment={environment}
                    assignment={assignment}
                    selectedExpeditionId={selectedExpeditionId}
                    onSelect={toggleSelection}
                  />
                )}
              </div>
            </div>
          </>
        )}
        {activeTab === "characters" && <CharactersTable heroes={heroes} />}
        {activeTab === "mows" && <MowTable machinesOfWar={machinesOfWar} />}
      </div>
    </main>
  );
}
