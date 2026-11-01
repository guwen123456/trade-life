import {
  ACHIEVEMENTS,
  BACKGROUNDS,
  CITIES,
  CLIENTS,
  MARKETS,
  PRODUCTS,
  STAFF_POOL,
  worldAt,
  type World,
} from "./content.ts";
import type {
  ActionId,
  ActionView,
  Choice,
  CityId,
  BackgroundId,
  Deal,
  Ending,
  Flags,
  GameState,
  Lifetime,
  LogEntry,
  MarketId,
  PlayerAction,
  ProductId,
  Stage,
  Tone,
} from "./types.ts";

export const COMMISSION = 0.3;
export const ACTIVE_CAP = 6;

const NEGOTIABLE: Stage[] = ["lead", "quote", "sample"];

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function yuan(n: number) {
  const v = Math.round(n);
  const sign = v < 0 ? "-" : "";
  return `${sign}¥${Math.abs(v).toLocaleString("zh-CN")}`;
}

export function yuanShort(n: number) {
  const v = Math.round(n);
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 100000000) return `${sign}${(a / 100000000).toFixed(2)}亿`;
  if (a >= 10000) {
    const w = a / 10000;
    return `${sign}${w >= 100 ? w.toFixed(0) : w.toFixed(1)}万`;
  }
  return `${sign}${a.toLocaleString("zh-CN")}`;
}

export function nextRng(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: next >>> 0 };
}

function roll(s: GameState) {
  const n = nextRng(s.rng);
  return { s: { ...s, rng: n.seed }, r: n.value };
}

function nid(s: GameState, prefix: string) {
  return { s: { ...s, seq: s.seq + 1 }, id: `${prefix}${s.seq}` };
}

function pushLog(s: GameState, text: string, tone: Tone): GameState {
  const got = nid(s, "l");
  const entry: LogEntry = { id: got.id, y: got.s.year, m: got.s.month, text, tone };
  return { ...got.s, log: [...got.s.log, entry].slice(-100) };
}

function patchDeal(s: GameState, id: string, patch: Partial<Deal>): GameState {
  return { ...s, deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}

function setFlags(s: GameState, patch: Partial<Flags>): GameState {
  return { ...s, flags: { ...s.flags, ...patch } };
}

export function companyLabel(s: GameState) {
  if (!s.independent) return "外贸公司业务员";
  if (s.staff <= 0) return "单干";
  if (s.staff <= 3) return "小型工作室";
  if (s.staff <= 8) return "贸易公司";
  return "外贸集团";
}

export function firmName(s: GameState) {
  const city = CITIES[s.city].name;
  if (!s.independent) return `${city}恒盛外贸`;
  const surname = s.name.slice(0, 1) || "林";
  return `${surname}氏通商`;
}

export function solarUnlocked(s: GameState) {
  return s.reputation >= 55 && s.expertise >= 45 && (s.independent || s.reputation >= 68);
}

export function salaryOf(s: GameState) {
  const base =
    s.background === "engineer" ? 8600 : s.background === "english" ? 7400 : s.background === "sales" ? 6200 : 8000;
  const cityK = s.city === "shenzhen" ? 1.16 : s.city === "guangzhou" ? 1.06 : s.city === "ningbo" ? 1.02 : 0.94;
  const repBonus = Math.floor(s.reputation / 10) * 450;
  return Math.round((base + repBonus) * cityK);
}

export function livingOf(s: GameState) {
  let n = CITIES[s.city].living;
  if (s.age >= 32) n *= 1.12;
  if (s.flags.married) n *= 1.22;
  if (s.flags.frugal) n *= 0.82;
  if (s.flags.payCutMonths > 0) n *= 0.78;
  return Math.round(n);
}

export function officeOf(s: GameState) {
  if (!s.independent) return 0;
  if (s.staff <= 0) return 1600;
  if (s.staff <= 3) return 6800 + s.staff * 900;
  if (s.staff <= 8) return 18000 + s.staff * 1400;
  return 42000 + s.staff * 1800;
}

export function payrollOf(s: GameState) {
  if (s.staff <= 0) return 0;
  const each = (7600 + s.staff * 380) * (1 + s.flags.wageBonus);
  return Math.round(each * s.staff);
}

export function creditLimit(s: GameState) {
  return Math.round(18000 + s.reputation * 1600 + Math.max(0, s.lifetime.profit) * 0.06);
}

export function netWorth(s: GameState) {
  const pipe = s.deals
    .filter((d) => d.stage === "confirmed" || d.stage === "production" || d.stage === "collecting")
    // 打工路线在手订单的最终所得就是提成，与回款结算同一口径：利润 × COMMISSION(0.3)。
    // 此前按 0.08 折算，与提成规则矛盾，净资产和结局评级被系统性低估。
    .reduce((sum, d) => sum + expectedProfit(s, d) * (s.independent ? 0.4 : COMMISSION), 0);
  return s.cash - s.debt + pipe;
}

function expectedProfit(s: GameState, d: Deal) {
  const world = worldAt(s.year, s.month);
  const revenue = d.valueUsd * world.usdCny;
  const mfg = d.quotedMfg > 0 ? d.quotedMfg : revenue * (1 - d.margin);
  const freight = d.freightPaid > 0 ? d.freightPaid : freightCost(d, world);
  return revenue * d.margin - Math.max(0, freight * 0.15);
}

function freightCost(d: Deal, world: World) {
  const base = PRODUCTS[d.product].freight;
  const bulk = 1 + Math.max(0, d.valueUsd - 20000) / 90000;
  return Math.round(base * world.freight * bulk);
}

function activeDeals(s: GameState) {
  return s.deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
}

function focusDeal(s: GameState) {
  return s.deals.find((d) => d.id === s.focusId);
}

function resolveTarget(s: GameState, pred: (d: Deal) => boolean) {
  const pool = activeDeals(s).filter(pred);
  const focused = focusDeal(s);
  if (focused && pred(focused)) return { deal: focused as Deal, reason: "" };
  if (focused && !pred(focused)) {
    return { deal: undefined, reason: `「${focused.client}」对不上这个动作` };
  }
  if (pool.length === 1) return { deal: pool[0], reason: "" };
  if (pool.length === 0) return { deal: undefined, reason: "没有处于这个阶段的单" };
  return { deal: undefined, reason: "有多张单，先点一张再操作" };
}

function blocked(s: GameState) {
  return Boolean(s.summary || s.pendingChoice || s.ending);
}

export function listActions(s: GameState): ActionView[] {
  const energy = s.energy > 0;
  const follow = resolveTarget(s, (d) => NEGOTIABLE.includes(d.stage));
  let followReason = follow.reason;
  let followOk = energy && Boolean(follow.deal);
  if (follow.deal?.stage === "quote" && s.independent) {
    const sample = PRODUCTS[follow.deal.product].sample;
    if (s.cash < sample) {
      followOk = false;
      followReason = `打样费 ${yuanShort(sample)} 还差一截`;
    }
  }
  const produce = resolveTarget(s, (d) => d.stage === "confirmed");
  const ship = resolveTarget(s, (d) => d.stage === "production" && d.monthsLeft <= 1);
  const collect = resolveTarget(s, (d) => d.stage === "collecting");
  const room = creditLimit(s) - s.debt;
  const produceDeal = produce.deal;
  let produceReason = produce.reason;
  if (produceDeal && !s.independent) produceReason = "";
  if (produceDeal && s.independent) {
    const world = worldAt(s.year, s.month);
    const mfg = produceDeal.valueUsd * world.usdCny * (1 - produceDeal.margin);
    const deposit = Math.round(mfg * 0.3);
    if (s.cash < deposit) produceReason = `定金大约 ${yuanShort(deposit)}，现金不够`;
  }
  const shipDeal = ship.deal;
  let shipReason = ship.reason;
  if (shipDeal && s.independent) {
    const freight = freightCost(shipDeal, worldAt(s.year, s.month));
    if (s.cash < freight) shipReason = `这票海运大约 ${yuanShort(freight)}，先凑钱`;
  }

  const views: ActionView[] = [
    {
      id: "prospect",
      title: "开发客户",
      energy: 1,
      detail: s.flags.platformMonths > 0 ? "平台还在续费期，询盘会多一点。" : "发开发信，等一个不像机器人的回复。",
      ok: energy && activeDeals(s).length < ACTIVE_CAP,
      reason: !energy ? "这个月的精力用完了" : "手里的单已经握满，先做完再开发",
    },
    {
      id: "follow",
      title: "推进洽谈",
      energy: 1,
      detail: follow.deal ? `推进「${follow.deal.client}」：报价、打样或逼单。` : "把询盘往签约推进一步。",
      ok: followOk,
      reason: !energy ? "这个月的精力用完了" : followReason,
    },
    {
      id: "produce",
      title: "下厂生产",
      energy: 1,
      detail: produceDeal
        ? s.independent
          ? `为「${produceDeal.client}」付 30% 定金，工厂才排期。`
          : `「${produceDeal.client}」由公司垫定金。`
        : "PI 签了才能下厂。",
      ok: energy && Boolean(produceDeal) && produceReason === "",
      reason: !energy ? "这个月的精力用完了" : produceReason || "没有待生产的单",
    },
    {
      id: "ship",
      title: "验货出运",
      energy: 1,
      detail: shipDeal
        ? shipDeal.monthsLeft > 0
          ? `「${shipDeal.client}」还能再等，硬出就是加急，次品风险会上去。`
          : `验「${shipDeal.client}」的货，然后订舱。`
        : "货好了才能验、才能走。",
      ok: energy && Boolean(shipDeal) && shipReason === "",
      reason: !energy ? "这个月的精力用完了" : shipReason || "没有能出运的单",
    },
    {
      id: "collect",
      title: "催收回款",
      energy: 1,
      detail: collect.deal
        ? collect.deal.monthsLeft > 0
          ? `「${collect.deal.client}」账期未到，催早了会伤关系。`
          : `向「${collect.deal.client}」要这笔钱。`
        : "没有待回款的单。",
      ok: energy && Boolean(collect.deal),
      reason: !energy ? "这个月的精力用完了" : collect.reason,
    },
    {
      id: "english",
      title: "补英语",
      energy: 1,
      detail: "把邮件里的客气，写成客户愿意回的那种。",
      ok: energy && s.english < 100,
      reason: !energy ? "这个月的精力用完了" : "英语已经够用",
    },
    {
      id: "expertise",
      title: "啃产品",
      energy: 1,
      detail: "下厂、看料、把验货表背熟。",
      ok: energy && s.expertise < 100,
      reason: !energy ? "这个月的精力用完了" : "专业已经到顶",
    },
    {
      id: "entertain",
      title: "跑展应酬",
      energy: 1,
      detail: worldAt(s.year, s.month).fair ? "广交会季，一杯茶能换一张真名片。" : "请客、换名片、听人抱怨船期。",
      ok: energy && (s.independent ? s.cash >= 1600 : s.cash >= 500),
      reason: !energy ? "这个月的精力用完了" : "应酬的钱不够",
    },
    {
      id: "rest",
      title: "停一下",
      energy: 1,
      detail: "把手机扣进抽屉。单子不会因为你愧疚就自己完成。",
      ok: energy,
      reason: "这个月的精力用完了",
    },
    {
      id: "resign",
      title: "辞职单干",
      energy: 1,
      detail: "不再拿提成。定金、海运和坏账都写你自己的名字。",
      ok: energy && !s.independent && s.reputation >= 28 && s.cash >= 20000,
      reason: s.independent
        ? "你已经是自己的老板"
        : !energy
          ? "这个月的精力用完了"
          : "声誉到 28，手里至少两万能接第一笔定金",
    },
    {
      id: "hire",
      title: "招人",
      energy: 1,
      detail: `签约费约 ${yuanShort(8000 + s.staff * 3000)}。同事会帮你催工厂。`,
      ok: energy && s.independent && s.staff < 12 && s.cash >= 8000 + s.staff * 3000,
      reason: !s.independent
        ? "还在给人打工，招不了自己的人"
        : !energy
          ? "这个月的精力用完了"
          : s.staff >= 12
            ? "人已经够多"
            : "签约费不够",
    },
    {
      id: "borrow",
      title: "动用额度",
      energy: 0,
      detail: `额度还剩 ${yuanShort(Math.max(0, room))}，月息 1.5%。`,
      ok: !blocked(s) && room >= 5000,
      reason: blocked(s) ? "先把这个月了结" : "银行不给更多额度了",
    },
    {
      id: "repay",
      title: "还一笔",
      energy: 0,
      detail: "利息会在每月底自己咬一口现金。",
      ok: !blocked(s) && s.debt > 0 && s.cash >= 5000,
      reason: blocked(s) ? "先把这个月了结" : s.debt <= 0 ? "没有负债" : "留下生活费再还",
    },
  ];
  return views;
}

function spend(s: GameState, n = 1) {
  return { ...s, energy: Math.max(0, s.energy - n) };
}

function skillChance(s: GameState, base: number, deal: Deal) {
  const market = MARKETS[deal.market];
  return clamp(
    base + s.english / 320 + s.expertise / 300 + deal.relation / 420 - market.diff - (s.stress > 85 ? 0.08 : 0),
    0.08,
    0.9,
  );
}

function pickLine(s: GameState, lines: string[]) {
  const got = roll(s);
  const item = lines[Math.floor(got.r * lines.length) % lines.length] ?? lines[0];
  return { s: got.s, item };
}

function closeDeal(s: GameState, id: string, stage: "won" | "lost") {
  const next = patchDeal(s, id, { stage, monthsLeft: 0 });
  const closed = next.deals.filter((d) => d.stage === "won" || d.stage === "lost");
  const keep = closed.slice(-5).map((d) => d.id);
  return {
    ...next,
    deals: next.deals.filter((d) => (d.stage !== "won" && d.stage !== "lost") || keep.includes(d.id)),
    focusId: next.focusId === id ? null : next.focusId,
  };
}

function prospect(s0: GameState) {
  let s = spend(s0);
  const world = worldAt(s.year, s.month);
  let chance =
    0.34 +
    s.network / 280 +
    s.english / 420 +
    world.demand * 0.18 +
    (world.fair ? 0.12 : 0) +
    (s.flags.platformMonths > 0 ? 0.1 : 0) +
    (s.flags.shopMonths > 0 ? 0.08 : 0);
  if (s.stress > 85) chance -= 0.1;
  const rolled = roll(s);
  s = rolled.s;
  if (rolled.r > clamp(chance, 0.12, 0.86)) {
    const miss = pickLine(s, [
      "发出去四十封。两封自动回复，一封问你是不是机器人。",
      "平台上的询盘看着眼熟，点开是去年那家还在比价的。",
      "今天没有新客户。茶凉了，邮箱也凉。",
    ]);
    return pushLog(miss.s, miss.item, "info");
  }
  return spawnLead(s, false);
}

function spawnLead(s0: GameState, warm: boolean) {
  let s = s0;
  const world = worldAt(s.year, s.month);
  const city = CITIES[s.city];
  let marketRoll = roll(s);
  s = marketRoll.s;
  // 后备市场抽取：把 [0.62, 1) 重新缩放回 [0, 1) 再取索引，保证城市市场池均匀可达。
  // 此前直接 floor(r * len)：r∈[0.62,1) 时索引恒为尾部几项，markets[0] 永远抽不到，分布偏斜。
  const fallbackIdx =
    Math.floor(((marketRoll.r - 0.62) / 0.38) * city.markets.length) % city.markets.length;
  const market: MarketId = marketRoll.r < 0.62 ? s.aimMarket : city.markets[fallbackIdx];
  let productRoll = roll(s);
  s = productRoll.s;
  let product: ProductId = s.aimProduct;
  if (productRoll.r > 0.55) {
    const pool = city.bias;
    product = pool[Math.floor(productRoll.r * pool.length) % pool.length];
  }
  if (product === "solar" && !solarUnlocked(s)) product = city.bias[0];
  const spec = PRODUCTS[product];
  const mkt = MARKETS[market];
  let valueRoll = roll(s);
  s = valueRoll.s;
  const spread = spec.valueMin + (spec.valueMax - spec.valueMin) * valueRoll.r;
  const scale = 1 + s.expertise / 180 + s.staff * 0.07 + (s.english > 75 ? 0.12 : 0);
  const valueUsd = Math.round((spread * mkt.size * scale) / 100) * 100;
  let margin =
    spec.baseMargin +
    s.expertise / 520 +
    (city.bias.includes(product) ? 0.02 : 0) -
    mkt.pressure -
    (market === "us" ? world.usTariff : 0);
  let jitter = roll(s);
  s = jitter.s;
  margin = clamp(margin + (jitter.r - 0.5) * 0.04, 0.05, 0.34);
  const names = CLIENTS[market];
  let nameRoll = roll(s);
  s = nameRoll.s;
  let client = names[Math.floor(nameRoll.r * names.length) % names.length];
  if (s.deals.some((d) => d.client === client)) client = `${client} II`;
  const got = nid(s, "d");
  s = got.s;
  const deal: Deal = {
    id: got.id,
    client,
    market,
    product,
    stage: warm ? "quote" : "lead",
    valueUsd,
    margin,
    relation: clamp((warm ? 58 : 34) + s.network / 12, 0, 100),
    monthsLeft: 0,
    readyWait: 0,
    payDelay: mkt.delay,
    quotedMfg: 0,
    depositPaid: 0,
    freightPaid: 0,
  };
  const line = warm
    ? `${client} 从老关系那边转来，直接要报价。${MARKETS[market].name}，${PRODUCTS[product].name}，约 $${valueUsd.toLocaleString("en-US")}。`
    : `新询盘：${client}。${MARKETS[market].name} / ${PRODUCTS[product].name}，大概 $${valueUsd.toLocaleString("en-US")}。`;
  return pushLog({ ...s, deals: [...s.deals, deal], focusId: s.focusId ?? deal.id }, line, "good");
}

function follow(s0: GameState) {
  const target = resolveTarget(s0, (d) => NEGOTIABLE.includes(d.stage));
  if (!target.deal) return s0;
  const deal = s0.deals.find((d) => d.id === target.deal!.id) ?? target.deal;
  if (deal.stage === "quote" && s0.independent && s0.cash < PRODUCTS[deal.product].sample) return s0;
  let s = spend(s0);
  if (deal.stage === "lead") {
    const p = skillChance(s, 0.42, deal);
    const got = roll(s);
    s = got.s;
    if (got.r < p) {
      s = patchDeal(s, deal.id, { stage: "quote", relation: clamp(deal.relation + 8, 0, 100) });
      return pushLog(s, `${deal.client} 要了正式报价。句子比上次短，这通常是好事。`, "good");
    }
    const relation = clamp(deal.relation - 10, 0, 100);
    if (relation < 18) {
      s = closeDeal(patchDeal(s, deal.id, { relation }), deal.id, "lost");
      return pushLog(s, `${deal.client} 已读不回。这张询盘可以归档了。`, "bad");
    }
    s = patchDeal(s, deal.id, { relation });
    return pushLog(s, `${deal.client} 说再看看。外贸里这句话的意思，通常是还在比价。`, "info");
  }
  if (deal.stage === "quote") {
    const sample = PRODUCTS[deal.product].sample;
    const p = skillChance(s, 0.4, deal);
    const got = roll(s);
    s = got.s;
    if (got.r < p) {
      if (s.independent) s = { ...s, cash: s.cash - sample };
      s = patchDeal(s, deal.id, { stage: "sample", relation: clamp(deal.relation + 6, 0, 100) });
      const who = s.independent ? `你付了样品费 ${yuan(sample)}。` : "样品费公司报销了。";
      return pushLog(s, `${deal.client} 同意打样。${who}`, "good");
    }
    const relation = clamp(deal.relation - 12, 0, 100);
    if (relation < 16) {
      s = closeDeal(patchDeal(s, deal.id, { relation }), deal.id, "lost");
      return pushLog(s, `报价被拒。${deal.client} 选了更便宜的一家，连客气都省了。`, "bad");
    }
    s = patchDeal(s, deal.id, { relation, margin: clamp(deal.margin - 0.015, 0.05, 0.34) });
    return pushLog(s, `${deal.client} 嫌贵。你把毛利悄悄削掉一截，等他们下次开口。`, "info");
  }
  const p = skillChance(s, 0.46, deal);
  const got = roll(s);
  s = got.s;
  if (got.r < p) {
    s = patchDeal(s, deal.id, {
      stage: "confirmed",
      relation: clamp(deal.relation + 10, 0, 100),
      monthsLeft: PRODUCTS[deal.product].lead,
    });
    return pushLog(s, `${deal.client} 的 PI 签下来了。数字落纸的那一下，比月薪具体。`, "gold");
  }
  if (got.r > 0.82) {
    s = closeDeal(s, deal.id, "lost");
    return pushLog(s, `样品到了，${deal.client} 说方向变了。单子没了，快递盒还在。`, "bad");
  }
  s = patchDeal(s, deal.id, { relation: clamp(deal.relation - 6, 0, 100) });
  return pushLog(s, `样品还在客户的会议上排队。${deal.client} 让你下周再问。`, "info");
}

function produce(s0: GameState) {
  const target = resolveTarget(s0, (d) => d.stage === "confirmed");
  if (!target.deal) return s0;
  const deal = target.deal;
  const world = worldAt(s0.year, s0.month);
  const quotedMfg = Math.round(deal.valueUsd * world.usdCny * (1 - deal.margin));
  const deposit = Math.round(quotedMfg * 0.3);
  if (s0.independent && s0.cash < deposit) return s0;
  let s = spend(s0);
  if (s.independent) s = { ...s, cash: s.cash - deposit };
  s = patchDeal(s, deal.id, {
    stage: "production",
    quotedMfg,
    depositPaid: s.independent ? deposit : 0,
    monthsLeft: PRODUCTS[deal.product].lead,
    readyWait: 0,
  });
  const pay = s.independent ? `定金 ${yuan(deposit)} 打给工厂。` : "公司垫了定金。";
  return pushLog(s, `${deal.client} 排上产线，预计 ${PRODUCTS[deal.product].lead} 个月。${pay}`, "good");
}

function ship(s0: GameState) {
  const target = resolveTarget(s0, (d) => d.stage === "production" && d.monthsLeft <= 1);
  if (!target.deal) return s0;
  const deal = s0.deals.find((d) => d.id === target.deal!.id) ?? target.deal;
  const world = worldAt(s0.year, s0.month);
  const freight = freightCost(deal, world);
  if (s0.independent && s0.cash < freight) return s0;
  let s = spend(s0);
  const rush = deal.monthsLeft > 0;
  if (s.independent) s = { ...s, cash: s.cash - freight };
  const spec = PRODUCTS[deal.product];
  let defect = spec.risk + 0.06 - s.expertise / 300 + (rush ? 0.16 : 0) + (s.stress > 85 ? 0.07 : 0);
  defect = clamp(defect, 0.03, 0.62);
  const got = roll(s);
  s = got.s;
  s = {
    ...s,
    lifetime: { ...s.lifetime, shipped: s.lifetime.shipped + 1 },
  };
  if (got.r < defect * 0.38) {
    s = closeDeal(s, deal.id, "lost");
    s = {
      ...s,
      reputation: clamp(s.reputation - 8, 0, 100),
      stress: clamp(s.stress + 12, 0, 100),
    };
    return pushLog(
      s,
      `验货没过。${deal.client} 拒收，${rush ? "加急" : "这批"}货砸在手里，定金也回不来。`,
      "bad",
    );
  }
  let margin = deal.margin;
  let relation = deal.relation;
  let note = `${deal.client} 的货上船了。海运 ${yuan(freight)}${s.independent ? " 从你账户走" : " 公司支付"}。`;
  if (got.r < defect) {
    margin = clamp(margin * 0.55, 0.04, 0.34);
    relation = clamp(relation - 14, 0, 100);
    note = `验货有色差。${deal.client} 要索赔，这单毛利被削掉将近一半。船还是走了。`;
    s = { ...s, reputation: clamp(s.reputation - 3, 0, 100), stress: clamp(s.stress + 6, 0, 100) };
  } else {
    s = { ...s, reputation: clamp(s.reputation + 2, 0, 100) };
  }
  const quotedMfg = deal.quotedMfg > 0 ? deal.quotedMfg : Math.round(deal.valueUsd * world.usdCny * (1 - margin));
  s = patchDeal(s, deal.id, {
    stage: "collecting",
    margin,
    relation,
    freightPaid: freight,
    quotedMfg,
    monthsLeft: deal.payDelay,
    readyWait: 0,
  });
  return pushLog(s, note, got.r < defect ? "bad" : "good");
}

function applyProfit(s0: GameState, deal: Deal, payRatio: number, auto: boolean) {
  let s = s0;
  const world = worldAt(s.year, s.month);
  const revenue = deal.valueUsd * world.usdCny * payRatio;
  const mfg = deal.quotedMfg > 0 ? deal.quotedMfg : deal.valueUsd * world.usdCny * (1 - deal.margin);
  const profit = revenue - mfg - deal.freightPaid;
  const balanceDue = Math.max(0, mfg - deal.depositPaid);
  let cashDelta = 0;
  if (s.independent) cashDelta = revenue - balanceDue;
  else cashDelta = Math.max(0, profit) * COMMISSION;
  s = {
    ...s,
    cash: s.cash + cashDelta,
    lifetime: {
      revenue: s.lifetime.revenue + deal.valueUsd * world.usdCny * payRatio,
      profit: s.lifetime.profit + (s.independent ? profit : cashDelta),
      orders: s.lifetime.orders + (payRatio > 0 ? 1 : 0),
      badDebt: s.lifetime.badDebt + (payRatio === 0 ? 1 : 0),
      shipped: s.lifetime.shipped,
    },
  };
  const fx = world.usdCny.toFixed(2);
  if (payRatio === 0) {
    s = closeDeal(s, deal.id, "lost");
    s = { ...s, reputation: clamp(s.reputation - 6, 0, 100), stress: clamp(s.stress + 14, 0, 100) };
    const owe = s.independent ? `工厂尾款仍要付，现金变动 ${yuan(cashDelta)}。` : "公司认了这笔亏，你没有提成。";
    return pushLog(s, `${auto ? "你没顾上催，" : ""}${deal.client} 的货款落空。${owe}`, "bad");
  }
  s = closeDeal(s, deal.id, "won");
  s = {
    ...s,
    reputation: clamp(s.reputation + (payRatio > 0.9 ? 3 : 1), 0, 100),
    network: clamp(s.network + 1, 0, 100),
    stress: clamp(s.stress - 4, 0, 100),
  };
  if (s.independent) {
    return pushLog(
      s,
      `${deal.client} ${payRatio > 0.9 ? "付清" : "只付了六成"}。汇率 ${fx}，这单利润 ${yuan(profit)}，进账 ${yuan(cashDelta)}。`,
      profit >= 0 ? "gold" : "bad",
    );
  }
  if (profit < 0) {
    s = { ...s, reputation: clamp(s.reputation - 3, 0, 100), stress: clamp(s.stress + 8, 0, 100) };
    return pushLog(s, `${deal.client} 这单公司是亏的。提成为零，主管的脸色另算。`, "bad");
  }
  return pushLog(
    s,
    `${deal.client} 货款落地。公司利润 ${yuan(profit)}，你的提成 ${yuan(cashDelta)}。`,
    "gold",
  );
}

function collect(s0: GameState, auto = false) {
  const target = resolveTarget(s0, (d) => d.stage === "collecting");
  if (!target.deal) return s0;
  const deal = s0.deals.find((d) => d.id === target.deal!.id) ?? target.deal;
  let s = auto ? s0 : spend(s0);
  if (deal.monthsLeft > 0 && !auto) {
    const got = roll(s);
    s = got.s;
    if (deal.relation > 64 && got.r < 0.34) {
      return applyProfit(s, { ...deal, monthsLeft: 0 }, 1, false);
    }
    s = patchDeal(s, deal.id, { relation: clamp(deal.relation - 6, 0, 100) });
    return pushLog(s, `${deal.client} 的账期还没到。催早了，对方回了一个冷淡的收到。`, "info");
  }
  const market = MARKETS[deal.market];
  const skill = clamp(0.82 + s.english / 500 + s.expertise / 600, 0.82, 1.12);
  const pFull = clamp(market.pay * (0.82 + deal.relation / 380) * skill, 0.18, 0.98);
  const got = roll(s);
  s = got.s;
  if (got.r < pFull) return applyProfit(s, deal, 1, auto);
  if (got.r < pFull + 0.2) return applyProfit(s, deal, 0.6, auto);
  return applyProfit(s, deal, 0, auto);
}

function study(s0: GameState, key: "english" | "expertise") {
  let s = spend(s0);
  if (s.independent) s = { ...s, cash: s.cash - 400 };
  const got = roll(s);
  s = got.s;
  const gain = 4 + Math.round(got.r * 4);
  if (key === "english") {
    s = { ...s, english: clamp(s.english + gain, 0, 100), stress: clamp(s.stress + 2, 0, 100) };
    return pushLog(s, `你把一封开发信改到第三遍。英语 +${gain}。`, "info");
  }
  s = { ...s, expertise: clamp(s.expertise + gain, 0, 100), stress: clamp(s.stress + 2, 0, 100) };
  return pushLog(s, `下午耗在车间里。专业 +${gain}，鞋上多了层灰。`, "info");
}

function entertain(s0: GameState) {
  const cost = s0.independent ? 1800 : 600;
  if (s0.cash < cost) return s0;
  let s = spend({ ...s0, cash: s0.cash - cost });
  const world = worldAt(s.year, s.month);
  s = {
    ...s,
    network: clamp(s.network + (world.fair ? 9 : 6), 0, 100),
    stress: clamp(s.stress + (world.fair ? 6 : 8), 0, 100),
    reputation: clamp(s.reputation + 1, 0, 100),
  };
  const got = roll(s);
  s = got.s;
  const hit = got.r < (world.fair ? 0.62 : 0.34);
  s = pushLog(
    s,
    world.fair
      ? `广交会上你站到嗓子发干。花费 ${yuan(cost)}，名片盒薄了一截。`
      : `晚上那顿饭花了 ${yuan(cost)}。有人抱怨船期，有人抱怨客户。`,
    "info",
  );
  if (hit && activeDeals(s).length < ACTIVE_CAP) return spawnLead(s, true);
  return s;
}

function rest(s0: GameState) {
  let s = spend(s0);
  s = {
    ...s,
    rested: true,
    stress: clamp(s.stress - 16, 0, 100),
    health: clamp(s.health + 7, 0, 100),
  };
  const got = pickLine(s, [
    "你把手机扣进抽屉。下午没有人跟你谈 EXW。",
    "睡了一个不被询盘切开的午觉。压力下去一点。",
    "你沿着码头走了走。集装箱还在，你的肩松了一点。",
  ]);
  return pushLog(got.s, got.item, "info");
}

function resign(s0: GameState) {
  if (s0.independent || s0.reputation < 28 || s0.cash < 20000) return s0;
  let s = spend(s0);
  const sev = salaryOf(s);
  s = {
    ...s,
    independent: true,
    cash: s.cash + sev,
    stress: clamp(s.stress + 8, 0, 100),
  };
  return pushLog(s, `辞呈交了。离职补偿 ${yuan(sev)} 到账。下一张定金，不会再有公司替你垫。`, "gold");
}

function hire(s0: GameState) {
  const cost = 8000 + s0.staff * 3000;
  if (!s0.independent || s0.staff >= 12 || s0.cash < cost) return s0;
  let s = spend({ ...s0, cash: s0.cash - cost });
  const name = STAFF_POOL[s.staff % STAFF_POOL.length];
  s = { ...s, staff: s.staff + 1, staffNames: [...s.staffNames, name] };
  return pushLog(s, `${name} 入职。签约费 ${yuan(cost)}。从此多一个人帮你问工厂：到底哪天好。`, "gold");
}

function borrow(s0: GameState) {
  const room = creditLimit(s0) - s0.debt;
  if (room < 5000 || blocked(s0)) return s0;
  const amount = Math.min(20000, room);
  const s = { ...s0, debt: s0.debt + amount, cash: s0.cash + amount };
  return pushLog(s, `从额度里取了 ${yuan(amount)}。月息 1.5%，它会在每个月底提醒你。`, "info");
}

function repay(s0: GameState) {
  if (s0.debt <= 0 || s0.cash < 5000 || blocked(s0)) return s0;
  const amount = Math.min(20000, s0.debt, s0.cash - 2000);
  if (amount <= 0) return s0;
  const s = { ...s0, debt: s0.debt - amount, cash: s0.cash - amount };
  return pushLog(s, `还掉 ${yuan(amount)}。负债还剩 ${yuan(s.debt)}。`, "good");
}

function perform(s: GameState, id: ActionId) {
  if (blocked(s)) return s;
  const view = listActions(s).find((a) => a.id === id);
  if (!view?.ok) return s;
  switch (id) {
    case "prospect":
      return prospect(s);
    case "follow":
      return follow(s);
    case "produce":
      return produce(s);
    case "ship":
      return ship(s);
    case "collect":
      return collect(s);
    case "english":
      return study(s, "english");
    case "expertise":
      return study(s, "expertise");
    case "entertain":
      return entertain(s);
    case "rest":
      return rest(s);
    case "resign":
      return resign(s);
    case "hire":
      return hire(s);
    case "borrow":
      return borrow(s);
    case "repay":
      return repay(s);
    default:
      return s;
  }
}

function energyMax(s: GameState) {
  let e = 3;
  if (s.stress >= 82 || s.health < 40) e = 2;
  if (s.stress >= 96 || s.health < 22) e = 1;
  if (s.flags.shelterMonths > 0) e = Math.max(1, e - 1);
  return e;
}

function staffWork(s0: GameState, lines: string[]) {
  let s = s0;
  if (s.staff <= 0) return s;
  let chased = 0;
  for (let i = 0; i < s.staff; i++) {
    const got = roll(s);
    s = got.s;
    const prod = s.deals.find((d) => d.stage === "production" && d.monthsLeft > 0);
    if (prod && got.r < 0.72) {
      s = patchDeal(s, prod.id, { monthsLeft: Math.max(0, prod.monthsLeft - 1) });
      chased += 1;
      continue;
    }
    const early = s.deals.find((d) => NEGOTIABLE.includes(d.stage));
    if (early && got.r < 0.9) {
      s = patchDeal(s, early.id, { relation: clamp(early.relation + 4, 0, 100) });
    }
  }
  if (chased > 0) lines.push(`同事盯工厂 ${chased} 趟，交期被往前挤了挤。`);
  return s;
}

function tickDeals(s: GameState, lines: string[]) {
  const overdue: Deal[] = [];
  const deals = s.deals.map((d) => {
    if (d.stage === "production") {
      if (d.monthsLeft > 0) return { ...d, monthsLeft: d.monthsLeft - 1 };
      const readyWait = d.readyWait + 1;
      if (readyWait >= 3) overdue.push({ ...d, readyWait });
      return { ...d, readyWait };
    }
    if (d.stage === "collecting") {
      if (d.monthsLeft > 0) return { ...d, monthsLeft: d.monthsLeft - 1 };
      const readyWait = d.readyWait + 1;
      if (readyWait >= 2) overdue.push({ ...d, readyWait });
      return { ...d, readyWait };
    }
    return d;
  });
  let next: GameState = { ...s, deals };
  for (const d of overdue) {
    const live = next.deals.find((x) => x.id === d.id);
    if (!live) continue;
    if (live.stage === "production") {
      lines.push(`${live.client} 的货在厂里放太久，产能让给了别人。定金回不来。`);
      next = closeDeal(next, live.id, "lost");
      next = { ...next, reputation: clamp(next.reputation - 4, 0, 100) };
    } else if (live.stage === "collecting") {
      lines.push(`你一直没催 ${live.client}，这个月底账自己滚过来了。`);
      next = collect({ ...next, focusId: live.id }, true);
    }
  }
  return next;
}

function settleCash(s: GameState, lines: string[]) {
  if (s.cash >= 0 || s.ending) return s;
  const need = -s.cash;
  const room = creditLimit(s) - s.debt;
  if (room >= need) {
    lines.push(`现金不够，额度自动补上 ${yuan(need)}。`);
    return { ...s, debt: s.debt + need, cash: 0 };
  }
  lines.push("额度也盖不住这个洞。资金链断了。");
  return { ...s, ending: makeEnding(s, "bankrupt") };
}

function makeEnding(s: GameState, id: Ending["id"]): Ending {
  const net = netWorth(s);
  const years = s.year - 2018;
  const city = CITIES[s.city].name;
  const orders = s.lifetime.orders;
  const rev = yuanShort(s.lifetime.revenue);
  const who = s.flags.married ? "家里有人等你回去" : "你还是一个人扛着账单";
  const team = s.staff > 0 ? `公司里还有 ${s.staff} 个人` : s.independent ? "你没有同事" : "你始终是别人的业务员";
  let rank = "过来人";
  let title = "这行你算见识过了";
  if (id === "bankrupt") {
    rank = "清算";
    title = "断在一票货上";
  } else if (id === "burnout") {
    rank = "停下来的人";
    title = "身体先签了字";
  } else if (net >= 80000000) {
    rank = "行里的传说";
    title = "名字比提单先到港";
  } else if (net >= 20000000) {
    rank = "外贸大佬";
    title = "公司比你更能熬夜";
  } else if (net >= 4000000) {
    rank = "站稳了";
    title = "一张还像样的资产负债表";
  } else if (net >= 800000) {
    rank = "中产边缘";
    title = "房子未必有，单子有过";
  }
  const cause =
    id === "bankrupt"
      ? "现金和额度一起见底。客户还在，账户不在了。"
      : id === "burnout"
        ? "压力把睡眠吃完以后，连开发信都像在爬山。"
        : id === "age"
          ? "年纪到了。你把椅子转给后来的人。"
          : "你自己决定收手。世界还在出运，你不必再跟每一封邮件。";
  return {
    id,
    rank,
    title,
    body: `${cause}${city}出发，大约 ${years} 年，做成 ${orders} 笔回款，累计流水 ${rev}。${team}，${who}。净资产大约 ${yuanShort(net)}。`,
  };
}

function maybeChoice(s0: GameState): GameState {
  let s = s0;
  if (s.pendingChoice || s.ending) return s;
  if (s.year === 2020 && s.month === 3 && !s.flags.covid) {
    s = setFlags(s, { covid: true });
    const options = [
      { id: "grind", label: "留在原地硬扛", hint: "压力大增，健康下降" },
      { id: "home", label: "回老家避两个月", hint: "压力下降，人脉和精力暂减" },
    ];
    if (s.staff > 0) options.push({ id: "cut", label: "裁掉一位同事", hint: "工资降下来，声誉受损" });
    else options.push({ id: "cutpay", label: "把自己的开销砍一截", hint: "生活费降低三个月" });
    return {
      ...s,
      pendingChoice: {
        id: "covid",
        title: "厂门关上的春天",
        body: "验货员出不了门，客户的邮件却还在问交期。你得选一种过法。",
        options,
      },
    };
  }
  const gate = roll(s);
  s = gate.s;
  if (gate.r > 0.62) return s;
  const bag: string[] = [];
  if (!s.flags.parents && s.age >= 25) bag.push("parents");
  if (!s.flags.weddingAsked && s.age >= 27 && s.age <= 36) bag.push("wedding");
  if (s.deals.some((d) => d.stage === "production")) bag.push("hike");
  if (s.deals.some((d) => (d.stage === "quote" || d.stage === "sample") && (d.market === "me" || d.market === "latam"))) {
    bag.push("kickback");
  }
  if (s.staff >= 2) bag.push("poach");
  if (s.month === 11) bag.push("landlord");
  if (s.independent && s.month === 1 && s.year > 2018) bag.push("renew");
  if (s.year >= 2019) bag.push("shop");
  if (bag.length === 0) return s;
  const pick = roll(s);
  s = pick.s;
  const id = bag[Math.floor(pick.r * bag.length) % bag.length];
  if (id === "parents") s = setFlags(s, { parents: true });
  if (id === "wedding") s = setFlags(s, { weddingAsked: true });
  return { ...s, pendingChoice: choiceById(id) };
}

function choiceById(id: string): Choice {
  switch (id) {
    case "parents":
      return {
        id,
        title: "家里来电话",
        body: "父亲要做一个不算小的手术。账单比你这个月的提成诚实。",
        options: [
          { id: "pay", label: "打两万回去", hint: "现金 −20,000，压力下降" },
          { id: "half", label: "先打五千", hint: "现金 −5,000，压力上升" },
          { id: "debt", label: "用额度垫上", hint: "负债 +20,000" },
        ],
      };
    case "wedding":
      return {
        id,
        title: "有人问你明年",
        body: "对方不是客户。这个问题不能用报价单回答。",
        options: [
          { id: "yes", label: "把日子定了", hint: "花费约 28,000，压力下降，开销变高" },
          { id: "no", label: "再等等", hint: "压力上升一点" },
        ],
      };
    case "hike":
      return {
        id,
        title: "工厂改口",
        body: "原料涨了。工厂说要么加价，要么你的交期让给付现金的人。",
        options: [
          { id: "pay", label: "认这个价", hint: "在产订单成本上升" },
          { id: "wait", label: "换厂重排", hint: "交期 +1 个月，压力上升" },
        ],
      };
    case "kickback":
      return {
        id,
        title: "报价单外面的话",
        body: "客户暗示，价格里留三个点给个人，合同可以这周签。",
        options: [
          { id: "yes", label: "把点留出来", hint: "这单更好签，声誉下降" },
          { id: "no", label: "只走公账", hint: "声誉上升，关系变冷" },
        ],
      };
    case "poach":
      return {
        id,
        title: "有人来挖人",
        body: "竞争对手开了更高的提成。你的同事把这件事当成闲聊告诉你。",
        options: [
          { id: "raise", label: "加薪留下", hint: "以后工资单更重" },
          { id: "let", label: "随他去", hint: "少一个人，声誉受损" },
        ],
      };
    case "landlord":
      return {
        id,
        title: "房东的消息",
        body: "房子明年要涨租。你也可以换远一点的地方，把钱留在出运上。",
        options: [
          { id: "stay", label: "续在原地", hint: "这个月多付 2,500" },
          { id: "move", label: "搬远一点", hint: "长期少花钱，压力上升" },
        ],
      };
    case "renew":
      return {
        id,
        title: "平台该续费了",
        body: "国际站的账单躺在邮箱里。不续，开发信会更像扔进海里。",
        options: [
          { id: "pay", label: "续一年", hint: "现金 −12,000，询盘变好" },
          { id: "skip", label: "先停掉", hint: "人脉和声誉下降" },
        ],
      };
    default:
      return {
        id: "shop",
        title: "同学的独立站",
        body: "老同学拉你入一股，做一个直接面对消费者的小店。他要 15,000。",
        options: [
          { id: "in", label: "入这股", hint: "现金 −15,000，半年内开发更容易" },
          { id: "out", label: "只做 B2B", hint: "不花钱，也不分心" },
        ],
      };
  }
}

function applyChoice(s0: GameState, optionId: string) {
  const choice = s0.pendingChoice;
  if (!choice) return s0;
  let s: GameState = { ...s0, pendingChoice: null };
  const lines: string[] = [];
  const say = (text: string, tone: Tone) => {
    s = pushLog(s, text, tone);
    lines.push(text);
  };
  if (choice.id === "parents" && optionId === "pay") {
    s = { ...s, cash: s.cash - 20000, stress: clamp(s.stress - 8, 0, 100) };
    say("两万打回家。电话那头松了一口气，你的账户瘦了一圈。", "info");
  } else if (choice.id === "parents" && optionId === "half") {
    s = { ...s, cash: s.cash - 5000, stress: clamp(s.stress + 8, 0, 100), reputation: clamp(s.reputation - 2, 0, 100) };
    say("你只打了五千。夜里会想这件事。", "bad");
  } else if (choice.id === "parents") {
    s = { ...s, debt: s.debt + 20000, stress: clamp(s.stress - 4, 0, 100) };
    say("手术费记进额度。家里先稳住，利息以后再算。", "info");
  } else if (choice.id === "wedding" && optionId === "yes") {
    s = setFlags({ ...s, cash: s.cash - 28000, stress: clamp(s.stress - 12, 0, 100), network: clamp(s.network + 6, 0, 100) }, { married: true });
    say("日子定了。婚礼把现金花出去，也把一点压力带走。", "gold");
  } else if (choice.id === "wedding") {
    s = { ...s, stress: clamp(s.stress + 5, 0, 100) };
    say("你说再等等。对方没再问第二遍。", "info");
  } else if (choice.id === "hike" && optionId === "pay") {
    const d = s.deals.find((x) => x.stage === "production");
    if (d) {
      s = patchDeal(s, d.id, {
        margin: clamp(d.margin - 0.03, 0.04, 0.34),
        quotedMfg: Math.round(d.quotedMfg * 1.06),
      });
    }
    say("你认了涨价。这张单的利润被原料咬掉一块。", "bad");
  } else if (choice.id === "hike") {
    const d = s.deals.find((x) => x.stage === "production");
    if (d) s = patchDeal(s, d.id, { monthsLeft: d.monthsLeft + 1 });
    s = { ...s, stress: clamp(s.stress + 6, 0, 100) };
    say("你换了厂。交期往后一个月，客户那边要重新解释。", "info");
  } else if (choice.id === "kickback" && optionId === "yes") {
    const d = s.deals.find((x) => (x.stage === "quote" || x.stage === "sample") && (x.market === "me" || x.market === "latam"));
    if (d) s = patchDeal(s, d.id, { margin: clamp(d.margin - 0.03, 0.04, 0.34), relation: clamp(d.relation + 22, 0, 100) });
    s = { ...s, reputation: clamp(s.reputation - 8, 0, 100), stress: clamp(s.stress + 5, 0, 100) };
    say("点留出去了。合同会好签，你的名字会脏一点。", "bad");
  } else if (choice.id === "kickback") {
    const d = s.deals.find((x) => (x.stage === "quote" || x.stage === "sample") && (x.market === "me" || x.market === "latam"));
    if (d) s = patchDeal(s, d.id, { relation: clamp(d.relation - 12, 0, 100) });
    s = { ...s, reputation: clamp(s.reputation + 4, 0, 100) };
    say("你只走公账。对方的语气冷下来，圈子里倒没什么话。", "good");
  } else if (choice.id === "poach" && optionId === "raise") {
    s = setFlags({ ...s, stress: clamp(s.stress - 3, 0, 100) }, { wageBonus: s.flags.wageBonus + 0.12 });
    say("你加了薪。人留下了，每个月底的工资单更沉。", "info");
  } else if (choice.id === "poach") {
    const names = s.staffNames.slice(0, -1);
    const left = s.staffNames[s.staffNames.length - 1] ?? "同事";
    s = { ...s, staff: Math.max(0, s.staff - 1), staffNames: names, reputation: clamp(s.reputation - 4, 0, 100), stress: clamp(s.stress + 6, 0, 100) };
    say(`${left} 走了。工位空出来的那天，询盘并没有变少。`, "bad");
  } else if (choice.id === "landlord" && optionId === "stay") {
    s = { ...s, cash: s.cash - 2500 };
    say("你续在原地。这个月多付了 2,500，通勤还是那么短。", "info");
  } else if (choice.id === "landlord") {
    s = setFlags({ ...s, stress: clamp(s.stress + 7, 0, 100), network: clamp(s.network - 2, 0, 100) }, { frugal: true });
    say("你搬远了。房租以后轻一点，早上会更黑。", "info");
  } else if (choice.id === "renew" && optionId === "pay") {
    s = setFlags({ ...s, cash: s.cash - 12000, network: clamp(s.network + 6, 0, 100) }, { platformMonths: 12 });
    say("平台又续了一年。开发信至少还有个码头可停。", "good");
  } else if (choice.id === "renew") {
    s = { ...s, network: clamp(s.network - 6, 0, 100), reputation: clamp(s.reputation - 2, 0, 100) };
    say("平台停了。你得更依赖老客户和饭局。", "bad");
  } else if (choice.id === "shop" && optionId === "in") {
    s = setFlags({ ...s, cash: s.cash - 15000 }, { shopMonths: 6 });
    say("你入了同学那一股。接下来半年，名字会出现在另一类客户眼前。", "info");
  } else if (choice.id === "covid" && optionId === "grind") {
    s = { ...s, stress: clamp(s.stress + 14, 0, 100), health: clamp(s.health - 8, 0, 100) };
    say("你留在城里硬扛。口罩、视频验货、睡不着。", "bad");
  } else if (choice.id === "covid" && optionId === "home") {
    s = setFlags(
      { ...s, stress: clamp(s.stress - 12, 0, 100), network: clamp(s.network - 8, 0, 100) },
      { shelterMonths: 2 },
    );
    say("你回了老家。两个月里精力更少，人也不在圈子里。", "info");
  } else if (choice.id === "covid" && optionId === "cut") {
    const left = s.staffNames[s.staffNames.length - 1] ?? "同事";
    s = {
      ...s,
      staff: Math.max(0, s.staff - 1),
      staffNames: s.staffNames.slice(0, -1),
      reputation: clamp(s.reputation - 7, 0, 100),
      stress: clamp(s.stress - 4, 0, 100),
    };
    say(`${left} 的工位撤了。工资单轻了，你不太想解释原因。`, "bad");
  } else if (choice.id === "covid") {
    s = setFlags({ ...s, stress: clamp(s.stress + 4, 0, 100) }, { payCutMonths: 3 });
    say("你把生活费砍到只够吃饭和网。这样撑三个月。", "info");
  } else {
    say("你把这件事放下了。外贸还在明天早上。", "info");
  }
  s = settleCash(s, lines);
  if (s.summary) s = { ...s, summary: { ...s.summary, lines: [...s.summary.lines, ...lines] } };
  return s;
}

function endMonth(s0: GameState) {
  if (blocked(s0)) return s0;
  const endedYear = s0.year;
  const endedMonth = s0.month;
  const lines: string[] = [];
  let s = staffWork(s0, lines);
  s = tickDeals(s, lines);
  if (s.ending) {
    return {
      ...s,
      summary: {
        endedYear,
        endedMonth,
        salary: 0,
        living: 0,
        office: 0,
        payroll: 0,
        interest: 0,
        lines,
      },
    };
  }
  const salary = s.independent ? 0 : salaryOf(s);
  const living = livingOf(s);
  const office = officeOf(s);
  const payroll = payrollOf(s);
  const interest = Math.round(s.debt * 0.015);
  s = { ...s, cash: s.cash + salary - living - office - payroll - interest };
  if (!s.independent) lines.push("主管问了一句这个月新客户。你把这句话算进压力里。");
  s = settleCash(s, lines);
  const load = activeDeals(s).length;
  const nextStress = clamp(s.stress + 1 + load - (s.rested ? 8 : 0) + (s.independent ? 0 : 1), 0, 100);
  const nextHealth = clamp(s.health + (nextStress > 78 ? -5 : 2), 0, 100);
  s = { ...s, stress: nextStress, health: nextHealth };
  if (s.health <= 0) {
    s = { ...s, ending: makeEnding(s, "burnout") };
    lines.push("身体先签字了。");
  } else if (s.stress >= 100) {
    const streak = s.flags.burnoutStreak + 1;
    s = setFlags(s, { burnoutStreak: streak });
    if (streak >= 2) {
      s = { ...s, ending: makeEnding(s, "burnout") };
      lines.push("连续两个月顶在极限上，你没有再撑住。");
    } else lines.push("压力到顶了。再这样一个月，人会先垮。");
  } else {
    s = setFlags(s, { burnoutStreak: 0 });
  }
  let year = s.year;
  let month = s.month + 1;
  let age = s.age;
  if (month > 12) {
    month = 1;
    year += 1;
    age += 1;
    lines.push(`元旦刚过。你 ${age} 岁了。`);
  }
  s = {
    ...s,
    year,
    month,
    age,
    rested: false,
    flags: {
      ...s.flags,
      shelterMonths: Math.max(0, s.flags.shelterMonths - 1),
      payCutMonths: Math.max(0, s.flags.payCutMonths - 1),
      shopMonths: Math.max(0, s.flags.shopMonths - 1),
      platformMonths: Math.max(0, s.flags.platformMonths - 1),
    },
  };
  if (s.age >= 60 && !s.ending) {
    s = { ...s, ending: makeEnding(s, "age") };
    lines.push("你把这门生意交了出去。");
  }
  const world = worldAt(s.year, s.month);
  lines.push(world.headline);
  s = pushLog(s, world.headline, "world");
  const point = { y: endedYear, m: endedMonth, cash: Math.round(s.cash) };
  s = { ...s, history: [...s.history, point].slice(-240), energy: s.ending ? 0 : energyMax(s) };
  s = maybeChoice(s);
  if (!s.ending && s.year === 2022 && s.month === 1) {
    lines.push("缺箱的一年过去了。你还在。");
  }
  return {
    ...s,
    summary: { endedYear, endedMonth, salary, living, office, payroll, interest, lines },
  };
}

function scan(s: GameState) {
  let next = s;
  const has = (id: string) => next.achievements.includes(id);
  const give = (id: string) => {
    if (has(id)) return;
    const meta = ACHIEVEMENTS.find((a) => a.id === id);
    next = { ...next, achievements: [...next.achievements, id] };
    if (meta) next = pushLog(next, `记下：${meta.title}。`, "gold");
  };
  if (next.deals.some((d) => ["confirmed", "production", "collecting", "won"].includes(d.stage)) || next.lifetime.shipped > 0) {
    give("first_pi");
  }
  if (next.lifetime.shipped > 0) give("first_ship");
  if (next.lifetime.orders > 0) give("first_pay");
  if (next.lifetime.badDebt > 0) give("bad");
  if (next.independent) give("solo");
  if (next.staff > 0) give("hire");
  if (next.lifetime.revenue >= 1_000_000) give("million");
  if (next.lifetime.revenue >= 10_000_000) give("ten");
  if (next.english >= 85) give("fluent");
  if (next.expertise >= 85) give("master");
  if (next.network >= 80) give("circle");
  if (next.reputation >= 80) give("name");
  if (next.year >= 2022 && (next.independent || next.lifetime.orders >= 3)) give("storm");
  if (next.staff >= 4) give("firm");
  if (next.staff >= 9) give("group");
  return sanitize(next);
}

function sanitize(s: GameState): GameState {
  const num = (n: number, d = 0) => (Number.isFinite(n) ? n : d);
  return {
    ...s,
    cash: num(s.cash),
    debt: Math.max(0, num(s.debt)),
    reputation: clamp(num(s.reputation), 0, 100),
    english: clamp(num(s.english), 0, 100),
    expertise: clamp(num(s.expertise), 0, 100),
    network: clamp(num(s.network), 0, 100),
    stress: clamp(num(s.stress), 0, 100),
    health: clamp(num(s.health), 0, 100),
    energy: Math.max(0, Math.round(num(s.energy))),
    staff: Math.max(0, Math.round(num(s.staff))),
  };
}

export function createGame(input: { name: string; city: CityId; background: BackgroundId; seed?: number }): GameState {
  const bg = BACKGROUNDS[input.background];
  const city = CITIES[input.city];
  const name = input.name.trim().slice(0, 12) || "林晓舟";
  const market = city.markets[0];
  const product = city.bias[0];
  const spec = PRODUCTS[product];
  const mkt = MARKETS[market];
  const client = CLIENTS[market][0];
  const emptyLife: Lifetime = { revenue: 0, profit: 0, orders: 0, badDebt: 0, shipped: 0 };
  const flags: Flags = {
    married: false,
    frugal: false,
    burnoutStreak: 0,
    parents: false,
    weddingAsked: false,
    covid: false,
    shelterMonths: 0,
    payCutMonths: 0,
    shopMonths: 0,
    platformMonths: 0,
    wageBonus: 0,
  };
  const deal: Deal = {
    id: "d1",
    client,
    market,
    product,
    stage: "quote",
    valueUsd: Math.round((spec.valueMin + spec.valueMax) / 2 / 100) * 100,
    margin: clamp(spec.baseMargin + bg.expertise / 500 + 0.02 - mkt.pressure, 0.05, 0.34),
    relation: 62,
    monthsLeft: 0,
    readyWait: 0,
    payDelay: 0,
    quotedMfg: 0,
    depositPaid: 0,
    freightPaid: 0,
  };
  let s: GameState = {
    version: 1,
    rng: (input.seed ?? Math.floor(Math.random() * 1_000_000_000)) >>> 0,
    seq: 2,
    name,
    city: input.city,
    background: input.background,
    independent: false,
    year: 2018,
    month: 3,
    age: 24,
    cash: bg.cash,
    debt: 0,
    reputation: bg.reputation,
    english: bg.english,
    expertise: bg.expertise,
    network: bg.network,
    stress: 30,
    health: 84,
    energy: 3,
    staff: 0,
    staffNames: [],
    deals: [deal],
    focusId: deal.id,
    aimMarket: market,
    aimProduct: product,
    log: [],
    history: [{ y: 2018, m: 3, cash: bg.cash }],
    lifetime: emptyLife,
    flags,
    achievements: [],
    pendingChoice: null,
    summary: null,
    ending: null,
    rested: false,
  };
  s = pushLog(s, `2018年3月，${name}在${city.name}把工牌挂好。窗外的集装箱比人老实。`, "world");
  s = pushLog(
    s,
    `${client} 的询盘停在报价。${mkt.name}，${spec.name}，约 $${deal.valueUsd.toLocaleString("en-US")}。先把它往前推。`,
    "info",
  );
  s = pushLog(s, "你还是业务员：公司垫定金和海运，利润你拿三成。哪天辞职，亏盈才全部写你的名字。", "info");
  return s;
}

export function reduce(state: GameState, action: PlayerAction): GameState {
  switch (action.type) {
    case "act":
      return scan(perform(state, action.id));
    case "focus": {
      if (blocked(state)) return state;
      return { ...state, focusId: state.focusId === action.id ? null : action.id };
    }
    case "aimMarket":
      return blocked(state) ? state : { ...state, aimMarket: action.id };
    case "aimProduct":
      if (blocked(state)) return state;
      if (action.id === "solar" && !solarUnlocked(state)) return state;
      return { ...state, aimProduct: action.id };
    case "endMonth":
      return scan(endMonth(state));
    case "choose":
      return scan(applyChoice(state, action.optionId));
    case "dismiss":
      return state.pendingChoice ? state : { ...state, summary: null };
    case "retire":
      if (state.age < 30 && state.year < 2023) return state;
      return { ...state, summary: null, pendingChoice: null, ending: makeEnding(state, "retire") };
    default:
      return state;
  }
}

export function canRetire(s: GameState) {
  return s.age >= 30 || s.year >= 2023;
}
