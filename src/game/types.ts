export type CityId = "yiwu" | "ningbo" | "shenzhen" | "guangzhou";
export type BackgroundId = "english" | "engineer" | "family" | "sales";
export type MarketId = "us" | "eu" | "jp" | "sea" | "me" | "latam";
export type ProductId = "gifts" | "textile" | "electronics" | "furniture" | "parts" | "solar";
export type Stage =
  | "lead"
  | "quote"
  | "sample"
  | "confirmed"
  | "production"
  | "collecting"
  | "won"
  | "lost";
export type Tone = "info" | "good" | "bad" | "gold" | "world";

export interface Deal {
  id: string;
  client: string;
  market: MarketId;
  product: ProductId;
  stage: Stage;
  valueUsd: number;
  margin: number;
  relation: number;
  monthsLeft: number;
  readyWait: number;
  payDelay: number;
  quotedMfg: number;
  depositPaid: number;
  freightPaid: number;
  /** 这张在产订单已经问过一次涨价。 */
  hikeSeen?: boolean;
  /** 这张洽谈已经问过一次回扣。 */
  greaseSeen?: boolean;
}

export interface LogEntry {
  id: string;
  y: number;
  m: number;
  text: string;
  tone: Tone;
}

export interface ChoiceOption {
  id: string;
  label: string;
  hint: string;
}

export interface Choice {
  id: string;
  title: string;
  body: string;
  options: ChoiceOption[];
}

export interface MonthSummary {
  endedYear: number;
  endedMonth: number;
  salary: number;
  living: number;
  office: number;
  payroll: number;
  interest: number;
  lines: string[];
  /** 一次结算跨过的月份。缺省当作 1。 */
  span?: number;
}

export interface Ending {
  id: "bankrupt" | "burnout" | "retire" | "age";
  rank: string;
  title: string;
  body: string;
}

export interface Flags {
  married: boolean;
  frugal: boolean;
  burnoutStreak: number;
  parents: boolean;
  weddingAsked: boolean;
  covid: boolean;
  shelterMonths: number;
  payCutMonths: number;
  shopMonths: number;
  platformMonths: number;
  wageBonus: number;
  /** 同学的独立站只问一次。旧档没有这个字段时当作还没问过。 */
  shopAsked: boolean;
  /** 开局前两次洽谈必定推进，用来把链路走通。旧档缺省为 0。 */
  tutorialLeft: number;
  /** 挖人事件的冷却月数。 */
  poachArm: number;
}

export interface Lifetime {
  revenue: number;
  profit: number;
  orders: number;
  badDebt: number;
  shipped: number;
}

export interface HistoryPoint {
  y: number;
  m: number;
  cash: number;
}

export interface GameState {
  version: number;
  rng: number;
  seq: number;
  name: string;
  city: CityId;
  background: BackgroundId;
  independent: boolean;
  year: number;
  month: number;
  age: number;
  cash: number;
  debt: number;
  reputation: number;
  english: number;
  expertise: number;
  network: number;
  stress: number;
  health: number;
  energy: number;
  staff: number;
  staffNames: string[];
  deals: Deal[];
  focusId: string | null;
  aimMarket: MarketId;
  aimProduct: ProductId;
  log: LogEntry[];
  history: HistoryPoint[];
  lifetime: Lifetime;
  flags: Flags;
  achievements: string[];
  pendingChoice: Choice | null;
  summary: MonthSummary | null;
  ending: Ending | null;
  rested: boolean;
}

export type ActionId =
  | "prospect"
  | "follow"
  | "produce"
  | "ship"
  | "collect"
  | "english"
  | "expertise"
  | "entertain"
  | "rest"
  | "resign"
  | "hire"
  | "borrow"
  | "repay";

export interface ActionView {
  id: ActionId;
  title: string;
  detail: string;
  energy: number;
  ok: boolean;
  reason: string;
}

export type PlayerAction =
  | { type: "act"; id: ActionId }
  | { type: "focus"; id: string }
  | { type: "aimMarket"; id: MarketId }
  | { type: "aimProduct"; id: ProductId }
  | { type: "endMonth" }
  | { type: "choose"; optionId: string }
  | { type: "dismiss" }
  | { type: "retire" }
  | { type: "fastForward" };
