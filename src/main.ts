import { invoke } from "@tauri-apps/api/core";

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
let goButton: HTMLButtonElement | null;

/**
 * Walks the response tree and returns the first array whose items contain
 * both a property with value `markerValue` and a property named `siblingKey`.
 */
function findArrayWith(root: unknown, markerValue: string, siblingKey: string): any[] | null {
  function walk(node: unknown): any[] | null {
    if (Array.isArray(node)) {
      const hit = node.find(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          Object.values(item as object).includes(markerValue) &&
          siblingKey in (item as object),
      );
      if (hit !== undefined) return node;
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }
    if (node !== null && typeof node === "object") {
      for (const v of Object.values(node as object)) {
        const found = walk(v);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(root);
}

function setStatus(message: string): void {
  if (statusEl) statusEl.textContent = message;
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

    heroes = findArrayWith(response, "worldKharn", "progressionIndex") ?? [];
    machinesOfWar = findArrayWith(response, "blackForgefiend", "primaryAbilityLevel") ?? [];

    setStatus(`Loaded ${board.length} expedition(s), ${heroes.length} hero(es), ${machinesOfWar.length} machine(s) of war.`);
    renderBoard(board);
  } catch (error) {
    setStatus(`Failed: ${error}`);
  } finally {
    if (goButton) goButton.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  statusEl = document.querySelector("#status-msg");
  boardEl = document.querySelector("#board-output");
  goButton = document.querySelector("#go-button");
  goButton?.addEventListener("click", go);
});
