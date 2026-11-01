import { SAVE_VERSION } from "./content";
import { normalizeGame } from "./engine";
import type { GameState } from "./types";

const KEY = "trade-life-save";

function valid(s: GameState) {
  return (
    s &&
    s.version === SAVE_VERSION &&
    typeof s.name === "string" &&
    Array.isArray(s.deals) &&
    Array.isArray(s.log) &&
    typeof s.year === "number"
  );
}

export function saveGame(state: GameState) {
  try {
    const raw = JSON.stringify({ version: SAVE_VERSION, state });
    localStorage.setItem(KEY, raw);
    localStorage.setItem(`${KEY}-bak`, raw);
  } catch {
    /* private mode or quota */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(`${KEY}-bak`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; state?: GameState };
    if (!parsed?.state || parsed.version !== SAVE_VERSION || !valid(parsed.state)) return null;
    return normalizeGame(parsed.state);
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(`${KEY}-bak`);
  } catch {
    /* ignore */
  }
}
