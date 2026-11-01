import { SAVE_VERSION } from "./content";
import type { GameState } from "./types";

const KEY = "trade-life-save";

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}
function isBool(v: unknown): v is boolean {
  return typeof v === "boolean";
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function allNums(o: Record<string, unknown>, keys: string[]) {
  return keys.every((k) => isNum(o[k]));
}
function allBools(o: Record<string, unknown>, keys: string[]) {
  return keys.every((k) => isBool(o[k]));
}

function validDeal(d: unknown) {
  if (!isObj(d)) return false;
  return (
    isStr(d.id) &&
    isStr(d.client) &&
    isStr(d.market) &&
    isStr(d.product) &&
    isStr(d.stage) &&
    allNums(d, [
      "valueUsd",
      "margin",
      "relation",
      "monthsLeft",
      "readyWait",
      "payDelay",
      "quotedMfg",
      "depositPaid",
      "freightPaid",
    ])
  );
}

function validLog(e: unknown) {
  if (!isObj(e)) return false;
  return isStr(e.id) && isStr(e.text) && isStr(e.tone) && isNum(e.y) && isNum(e.m);
}

function validHistory(h: unknown) {
  if (!isObj(h)) return false;
  return isNum(h.y) && isNum(h.m) && isNum(h.cash);
}

// 结构校验：标量、订单/日志/历史的内部结构、lifetime 与 flags 都逐项验类型。
// 任一关键字段坏掉就整档判废（loadGame 返回 null 走新开局），避免坏存档加载后
// 在渲染或月结算时崩溃。存档版本号语义不变，仍为 SAVE_VERSION 精确匹配。
function valid(raw: unknown): raw is GameState {
  if (!isObj(raw)) return false;
  const s = raw;
  if (s.version !== SAVE_VERSION) return false;
  if (!isStr(s.name) || !isStr(s.city) || !isStr(s.background)) return false;
  if (!isStr(s.aimMarket) || !isStr(s.aimProduct)) return false;
  if (!isBool(s.independent) || !isBool(s.rested)) return false;
  if (
    !allNums(s, [
      "rng",
      "seq",
      "year",
      "month",
      "age",
      "cash",
      "debt",
      "reputation",
      "english",
      "expertise",
      "network",
      "stress",
      "health",
      "energy",
      "staff",
    ])
  )
    return false;
  if (!(s.focusId === null || isStr(s.focusId))) return false;
  if (!Array.isArray(s.staffNames) || !s.staffNames.every(isStr)) return false;
  if (!Array.isArray(s.achievements) || !s.achievements.every(isStr)) return false;
  if (!Array.isArray(s.deals) || !s.deals.every(validDeal)) return false;
  if (!Array.isArray(s.log) || !s.log.every(validLog)) return false;
  if (!Array.isArray(s.history) || !s.history.every(validHistory)) return false;
  if (!isObj(s.lifetime)) return false;
  if (!allNums(s.lifetime, ["revenue", "profit", "orders", "badDebt", "shipped"])) return false;
  if (!isObj(s.flags)) return false;
  if (!allBools(s.flags, ["married", "frugal", "parents", "weddingAsked", "covid"])) return false;
  if (
    !allNums(s.flags, [
      "burnoutStreak",
      "shelterMonths",
      "payCutMonths",
      "shopMonths",
      "platformMonths",
      "wageBonus",
    ])
  )
    return false;
  // 可空对象只做浅校验：为 null 或具备渲染层要读的关键字段即可。
  if (!(s.summary === null || isObj(s.summary))) return false;
  if (
    !(
      s.pendingChoice === null ||
      (isObj(s.pendingChoice) && isStr(s.pendingChoice.id) && Array.isArray(s.pendingChoice.options))
    )
  )
    return false;
  if (!(s.ending === null || (isObj(s.ending) && isStr(s.ending.id)))) return false;
  return true;
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
    return parsed.state;
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
