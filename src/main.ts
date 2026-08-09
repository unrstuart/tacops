import { invoke } from "@tauri-apps/api/core";
import characterData from "./assets/character-data.json";
import mowData from "./assets/mow-data.json";

const characterIds = new Set((characterData as { id: string }[]).map((c) => c.id));
const mowIds = new Set((mowData as { mows: { snowprintId: string }[] }).mows.map((m) => m.snowprintId));

interface Credentials {
  userId: string;
  clientSecret: string;
  snowId: string;
}

interface BonusObjective {
  objectiveType: string;
  objectiveTarget?: string;
}

interface ExpeditionBoardEntry {
  expeditionId: string;
  id: string;
  category: string;
  rarity: string;
  participants: number;
  duration: number;
  bonusObjectives: BonusObjective[];
  baseRewards: string[];
  bonusRewards: string[];
  status: string;
}

// Roster arrays populated after each successful fetch; available for future phases.
export let heroes: any[] = [];
export let machinesOfWar: any[] = [];

let statusEl: HTMLElement | null;
let boardEl: HTMLElement | null;
let charactersEl: HTMLElement | null;
let mowEl: HTMLElement | null;
let goButton: HTMLButtonElement | null;

function setStatus(message: string): void {
  if (statusEl) statusEl.textContent = message;
}

/** Renders any flat-ish array as a table; nested objects are shown as JSON. */
function renderGenericList(container: HTMLElement, items: any[], emptyMsg: string): void {
  if (items.length === 0) {
    container.textContent = emptyMsg;
    return;
  }
  const keySet = new Set<string>();
  for (const item of items) {
    if (item && typeof item === "object") {
      for (const k of Object.keys(item as object)) keySet.add(k);
    }
  }
  const keys = ["id", ...Array.from(keySet).filter((k) => k !== "id")];
  const fmt = (v: unknown) =>
    v === null || v === undefined
      ? ""
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
  const rows = items
    .map((item) => `<tr>${keys.map((k) => `<td>${fmt(item[k])}</td>`).join("")}</tr>`)
    .join("");
  container.innerHTML = `<table>
    <thead><tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderBoard(board: ExpeditionBoardEntry[]): void {
  if (!boardEl) return;

  if (board.length === 0) {
    boardEl.textContent = "No expeditions on the board right now.";
    return;
  }

  const rows = board
    .map((entry) => {
      const objectives = entry.bonusObjectives
        .map((o) => (o.objectiveTarget ? `${o.objectiveType}: ${o.objectiveTarget}` : o.objectiveType))
        .join(", ");
      return `<tr>
        <td>${entry.category}</td>
        <td>${entry.rarity}</td>
        <td>${objectives}</td>
        <td>${(entry.baseRewards ?? []).join(", ")}</td>
        <td>${(entry.bonusRewards ?? []).join(", ")}</td>
        <td>${entry.status}</td>
      </tr>`;
    })
    .join("");

  boardEl.innerHTML = `<table>
    <thead>
      <tr><th>Category</th><th>Rarity</th><th>Bonus Objectives</th><th>Base Rewards</th><th>Bonus Rewards</th><th>Status</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function go(): Promise<void> {
  if (goButton) goButton.disabled = true;
  if (boardEl) boardEl.innerHTML = "";

  try {
    setStatus("Reading local credentials...");
    const credentials = await invoke<Credentials>("find_credentials");

    setStatus("Fetching player data...");
    const response = await invoke<any>("fetch_player_data", { ...credentials });

    const board: ExpeditionBoardEntry[] | undefined =
      response?.eventResult?.eventResponseData?.player?.hero?.progress?.expeditions?.board;

    if (!board) {
      setStatus("Fetched player data, but couldn't find an expeditions board in the response.");
      return;
    }

    const hero = response?.eventResult?.eventResponseData?.player?.hero;
    const units: any[] = Object.entries(hero?.units?.units ?? {}).map(([id, data]) => ({ id, ...(data as object) }));
    heroes = units.filter((u) => characterIds.has(u.id));
    machinesOfWar = units.filter((u) => mowIds.has(u.id));

    setStatus(`Loaded ${board.length} expedition(s), ${heroes.length} hero(es), ${machinesOfWar.length} machine(s) of war.`);
    renderBoard(board);
    if (charactersEl) renderGenericList(charactersEl, heroes, "No characters found.");
    if (mowEl) renderGenericList(mowEl, machinesOfWar, "No machines of war found.");
  } catch (error) {
    setStatus(`Failed: ${error}`);
  } finally {
    if (goButton) goButton.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  statusEl = document.querySelector("#status-msg");
  boardEl = document.querySelector("#board-output");
  charactersEl = document.querySelector("#characters-output");
  mowEl = document.querySelector("#mow-output");
  goButton = document.querySelector("#go-button");
  goButton?.addEventListener("click", go);

  document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.remove("hidden");
    });
  });
});
