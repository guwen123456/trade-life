import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Briefcase,
  Compass,
  Landmark,
  Ship,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import {
  ACHIEVEMENTS,
  BACKGROUNDS,
  CITIES,
  MARKETS,
  NAME_POOL,
  PRODUCTS,
  STAGE_LABEL,
  worldAt,
} from "@/game/content";
import {
  canRetire,
  companyLabel,
  creditLimit,
  firmName,
  listActions,
  livingOf,
  netWorth,
  officeOf,
  payrollOf,
  reduce,
  salaryOf,
  solarUnlocked,
  yuan,
  yuanShort,
  createGame,
} from "@/game/engine";
import { musicMuted, setMusicMuted, unlockAmbience } from "@/game/ambience";
import { clearSave, loadGame, saveGame } from "@/game/save";
import type {
  ActionId,
  BackgroundId,
  CityId,
  Deal,
  GameState,
  MarketId,
  ProductId,
  Tone,
} from "@/game/types";

type Tab = "log" | "act" | "deals" | "file";

const TONE: Record<Tone, string> = {
  info: "text-ink",
  good: "text-sea-ink",
  bad: "text-seal",
  gold: "text-brass-2",
  world: "text-ink-soft",
};

export function TradeApp() {
  const [ready, setReady] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [creating, setCreating] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);

  useEffect(() => {
    setHasSave(Boolean(loadGame()));
    setReady(true);
  }, []);

  useEffect(() => {
    const unlock = () => unlockAmbience();
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && game) saveGame(game);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [game]);

  if (!ready && !game) return <Title hasSave={false} pending onNew={() => undefined} onContinue={() => undefined} />;
  if (!game && creating) {
    return (
      <Create
        onBack={() => setCreating(false)}
        onStart={(next) => {
          unlockAmbience();
          setCreating(false);
          setGame(next);
        }}
      />
    );
  }
  if (!game) {
    return (
      <Title
        hasSave={hasSave}
        pending={false}
        onNew={() => {
          unlockAmbience();
          setCreating(true);
        }}
        onContinue={() => {
          unlockAmbience();
          const loaded = loadGame();
          if (loaded) setGame(loaded);
        }}
      />
    );
  }
  if (game.ending && !game.summary) {
    return (
      <Ending
        game={game}
        onAgain={() => {
          clearSave();
          setHasSave(false);
          setGame(null);
          setCreating(true);
        }}
        onTitle={() => {
          clearSave();
          setHasSave(false);
          setGame(null);
        }}
      />
    );
  }
  return <Desk game={game} setGame={setGame} />;
}

function Title({
  hasSave,
  pending,
  onNew,
  onContinue,
}: {
  hasSave: boolean;
  pending: boolean;
  onNew: () => void;
  onContinue: () => void;
}) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <img src={`${import.meta.env.BASE_URL}harbor.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="hero-shade absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col justify-end px-4 py-6 md:justify-center md:px-8">
        <div className="mb-3 flex justify-end">
          <MusicButton />
        </div>
        <p className="text-sm tracking-[0.2em] text-brass">2018 · 义乌 / 宁波 / 深圳 / 广州</p>
        <h1 className="mt-2 font-serif text-5xl text-foam md:text-7xl">外贸人生</h1>
        <p className="mt-3 max-w-xl text-lg text-foam">从一封开发信，到一纸提单。</p>
        <article className="paper-grain mt-6 max-w-xl rounded-card p-5 text-ink shadow-none">
          <p>
            你二十四岁，工位对着一排货代的朋友圈。有人靠一票货翻身，有人把信用证读成了欠条。汇率、疫情、缺箱和客户的已读不回，都会来。
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              data-testid="start"
              onClick={onNew}
              className="min-h-11 rounded-xl bg-brass px-5 py-3 font-serif text-lg text-ink"
            >
              开始这段人生
            </button>
            {hasSave && !pending ? (
              <button
                type="button"
                onClick={onContinue}
                className="min-h-11 rounded-xl border border-brass-2 bg-paper px-5 py-3 text-ink"
              >
                继续上次
              </button>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-ink-soft">进度记在这台浏览器里。点一下就会有港口的底噪，右上角可以关掉。</p>
        </article>
      </div>
    </main>
  );
}

function Create({ onBack, onStart }: { onBack: () => void; onStart: (g: GameState) => void }) {
  const [name, setName] = useState("林晓舟");
  const [city, setCity] = useState<CityId>("ningbo");
  const [background, setBackground] = useState<BackgroundId>("english");
  const bg = BACKGROUNDS[background];
  const cityMeta = CITIES[city];
  return (
    <main className="min-h-dvh overflow-x-hidden bg-harbor">
      <div className="mx-auto grid max-w-6xl md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="px-4 py-5 md:px-8 md:py-8">
          <button type="button" onClick={onBack} className="min-h-11 text-sm text-brass">
            返回
          </button>
          <h1 className="mt-2 font-serif text-4xl text-foam">入行</h1>
          <p className="mt-2 max-w-xl text-mist">选一座城，选一种出身。2018 年 3 月，你二十四岁。</p>

          <label className="mt-6 block text-sm text-mist" htmlFor="hero-name">
            名字
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="hero-name"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-dock px-3 text-foam"
            />
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-xl border border-line bg-panel px-3 text-foam"
              onClick={() => setName(NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)] ?? "林晓舟")}
            >
              换一个
            </button>
          </div>

          <h2 className="mt-6 font-serif text-xl text-foam">城市</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(CITIES) as CityId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={city === id}
                onClick={() => setCity(id)}
                className={`min-h-11 rounded-xl border px-4 py-3 text-left ${city === id ? "border-brass bg-panel" : "border-line bg-dock"}`}
              >
                <span className="font-serif text-lg text-foam">{CITIES[id].name}</span>
                <span className="mt-1 block break-words text-sm text-mist">{CITIES[id].blurb}</span>
              </button>
            ))}
          </div>

          <h2 className="mt-6 font-serif text-xl text-foam">出身</h2>
          <div className="mt-3 grid gap-2">
            {(Object.keys(BACKGROUNDS) as BackgroundId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={background === id}
                onClick={() => setBackground(id)}
                className={`min-h-11 rounded-xl border px-4 py-3 text-left ${background === id ? "border-brass bg-panel" : "border-line bg-dock"}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-lg text-foam">{BACKGROUNDS[id].label}</span>
                  <span className="shrink-0 text-sm text-brass">{yuanShort(BACKGROUNDS[id].cash)}</span>
                </span>
                <span className="mt-1 block break-words text-sm text-mist">{BACKGROUNDS[id].blurb}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onStart(createGame({ name, city, background, seed: Math.floor(Math.random() * 1_000_000_000) }))}
            className="mt-6 min-h-11 w-full rounded-xl bg-brass px-4 py-3 font-serif text-lg text-ink disabled:opacity-40 sm:w-auto"
          >
            挂上工牌
          </button>
        </div>
        <aside className="hidden md:block">
          <img src={`${import.meta.env.BASE_URL}desk.jpg`} alt="" className="h-full w-full object-cover object-[center_20%]" />
        </aside>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 md:px-8">
        <div className="grid grid-cols-2 gap-2 rounded-card border border-line bg-dock p-4 sm:grid-cols-4">
          <Mini k="现金" v={yuanShort(bg.cash)} />
          <Mini k="英语" v={String(bg.english)} />
          <Mini k="专业" v={String(bg.expertise)} />
          <Mini k="人脉" v={String(bg.network)} />
          <Mini k="月生活" v={yuanShort(cityMeta.living)} />
          <Mini k="主攻" v={PRODUCTS[cityMeta.bias[0]].name} />
          <Mini k="市场" v={MARKETS[cityMeta.markets[0]].name} />
          <Mini k="声誉" v={String(bg.reputation)} />
        </div>
      </div>
    </main>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-mist">{k}</p>
      <p className="truncate font-serif text-foam">{v}</p>
    </div>
  );
}

function Desk({ game, setGame }: { game: GameState; setGame: (g: GameState) => void }) {
  const [tab, setTab] = useState<Tab>("log");
  const [fileOpen, setFileOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevCash = useRef(game.cash);
  const logRef = useRef<HTMLDivElement>(null);
  const world = worldAt(game.year, game.month);
  const actions = useMemo(() => listActions(game), [game]);
  const ready = actions.filter((action) => action.ok);
  const blocked = actions.filter((action) => !action.ok);

  useEffect(() => {
    if (game.cash > prevCash.current) setFlash(true);
    prevCash.current = game.cash;
    const t = window.setTimeout(() => setFlash(false), 700);
    return () => window.clearTimeout(t);
  }, [game.cash]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0 });
  }, [game.log.length]);

  const act = (id: ActionId) => {
    setGame(reduce(game, { type: "act", id }));
    setTab("log");
  };

  const openDeals = game.deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const closed = game.deals.filter((d) => d.stage === "won" || d.stage === "lost");

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-harbor">
      <header className="shrink-0 border-b border-line px-4 py-3 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-brass">
              {game.year}年{game.month}月 · {game.age}岁
            </p>
            <h1 className="truncate font-serif text-2xl text-foam">
              {game.name}
              <span className="ml-2 text-base text-mist">
                {CITIES[game.city].name} · {companyLabel(game)}
              </span>
            </h1>
            <p className="truncate text-sm text-mist">{firmName(game)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <MusicButton />
            <button
              type="button"
              className="hidden min-h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm text-foam md:inline-flex"
              onClick={() => setFileOpen(true)}
            >
              <UserRound size={16} />
              档案
            </button>
          </div>
        </div>
        <p className="mt-2 break-words text-sm text-brass">{world.headline}</p>
        <p className="text-xs text-mist">
          美元 {world.usdCny.toFixed(2)} · 运价 ×{world.freight.toFixed(2)}
          {world.fair ? " · 广交会" : ""}
          {world.usTariff > 0 ? " · 对美关税" : ""}
        </p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Stat label="现金" value={yuanShort(game.cash)} className={flash ? "cash-flash" : "text-brass"} />
          <Stat label="负债" value={yuanShort(game.debt)} className={game.debt > 0 ? "text-seal" : "text-foam"} />
          <Stat label="净资产" value={yuanShort(netWorth(game))} className="text-foam" />
          <Stat label="声誉" value={String(Math.round(game.reputation))} className="text-foam" />
          <Stat label="英语" value={String(Math.round(game.english))} className="text-foam" />
          <Stat label="专业" value={String(Math.round(game.expertise))} className="text-foam" />
          <Stat label="人脉" value={String(Math.round(game.network))} className="text-foam" />
          <Stat label="压力" value={String(Math.round(game.stress))} className={game.stress > 75 ? "text-seal" : "text-foam"} />
          <Stat label="健康" value={String(Math.round(game.health))} className={game.health < 45 ? "text-seal" : "text-sea"} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-mist">精力</span>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-3 w-3 shrink-0 rounded-full ${i < game.energy ? "bg-brass" : "bg-line"}`} />
          ))}
          {game.stress >= 72 ? (
            <span className="min-w-0 truncate text-xs text-seal">压力太高。留一点精力停一下，不然人会先垮。</span>
          ) : game.lifetime.orders === 0 && game.year === 2018 ? (
            <span className="min-w-0 truncate text-xs text-mist">先推进在手的报价。一个月只有这么点精力。</span>
          ) : null}
        </div>
      </header>

      {tab === "file" ? (
        <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
          <Profile game={game} setGame={setGame} onClose={() => setTab("log")} />
        </div>
      ) : (
        <>
          <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(0,1fr)_22rem]">
            <section className={`${tab === "log" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col md:flex`}>
              <div className="flex min-h-0 min-w-0 flex-1">
                <div className="spine hidden items-center justify-center bg-seal px-2 font-serif text-sm text-paper md:flex">
                  业务手记
                </div>
                <div ref={logRef} className="paper-grain min-h-0 min-w-0 flex-1 overflow-y-auto p-4 text-ink md:p-5">
                  <ol className="mx-auto flex max-w-2xl flex-col gap-4">
                    {[...game.log].reverse().map((entry) => (
                      <li key={entry.id} className="border-b border-brass-2/30 pb-3">
                        <p className="text-xs text-ink-soft">
                          {entry.y}年{entry.m}月
                        </p>
                        <p className={`break-words ${TONE[entry.tone]}`}>{entry.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
            <section className={`act-list ${tab === "act" ? "flex" : "hidden"} min-h-0 flex-col md:flex`}>
              <div className="flex min-w-0 flex-col gap-2 px-4 py-3">
                {ready.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => act(action.id)}
                    className="act-btn min-h-11 rounded-xl border border-brass bg-panel px-4 py-3"
                  >
                    <span className="flex min-w-0 items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 font-medium break-words text-foam">{action.title}</span>
                      <span className="shrink-0 text-xs text-brass">{action.energy ? `精力 ${action.energy}` : "不耗精力"}</span>
                    </span>
                    <span className="mt-1 block break-words text-sm leading-6 text-mist">{action.detail}</span>
                  </button>
                ))}
                {blocked.length > 0 ? (
                  <div className="rounded-xl border border-line px-4 py-3">
                    <p className="text-xs text-mist">这会儿做不了</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {blocked.map((action) => (
                        <li key={action.id} className="min-w-0 break-words text-sm leading-6 text-mist">
                          <span className="text-foam">{action.title}</span>
                          <span> · {action.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="sticky bottom-0 mt-auto border-t border-line bg-harbor px-4 py-3">
                <button
                  type="button"
                  data-testid="end-month"
                  disabled={Boolean(game.summary || game.pendingChoice || game.ending)}
                  onClick={() => setGame(reduce(game, { type: "endMonth" }))}
                  className="act-btn min-h-11 items-center rounded-xl bg-brass px-4 py-3 font-serif text-lg text-ink disabled:opacity-40"
                >
                  结束本月
                </button>
                <p className="mt-2 break-words text-xs text-mist">未用完的精力不会攒到下月。生活费、房租和利息在这时结算。</p>
              </div>
            </section>
          </div>
          <section className={`${tab === "deals" ? "flex" : "hidden"} max-h-[46%] min-h-0 shrink-0 flex-col border-t border-line md:flex md:max-h-56`}>
            <div className="flex items-center justify-between px-4 pt-2">
              <h2 className="font-serif text-foam">在手订单</h2>
              <p className="text-xs text-mist">{openDeals.length} 张进行中</p>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 py-3">
              {openDeals.length === 0 ? <p className="text-sm text-mist">没有在手的单。去开发客户。</p> : null}
              {openDeals.map((deal) => (
                <DealTicket
                  key={deal.id}
                  deal={deal}
                  active={game.focusId === deal.id}
                  onPick={() => setGame(reduce(game, { type: "focus", id: deal.id }))}
                />
              ))}
              {closed.map((deal) => (
                <DealTicket key={deal.id} deal={deal} active={false} muted onPick={() => undefined} />
              ))}
            </div>
          </section>
        </>
      )}

      <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-dock md:hidden">
        <TabButton id="log" tab={tab} setTab={setTab} icon={<BookOpen size={16} />} label="手记" />
        <TabButton id="act" tab={tab} setTab={setTab} icon={<Compass size={16} />} label="行动" />
        <TabButton id="deals" tab={tab} setTab={setTab} icon={<Ship size={16} />} label="订单" />
        <TabButton id="file" tab={tab} setTab={setTab} icon={<Briefcase size={16} />} label="档案" />
      </nav>

      {fileOpen ? (
        <div className="fixed inset-0 z-40 hidden items-center justify-center bg-harbor/80 p-4 md:flex">
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-card border border-line bg-dock">
            <Profile game={game} setGame={setGame} onClose={() => setFileOpen(false)} />
          </div>
        </div>
      ) : null}

      {game.summary ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-harbor/80 p-3 sm:items-center">
          <article className="paper-grain max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-card p-5 text-ink">
            <p className="text-sm text-ink-soft">
              {game.summary.endedYear}年{game.summary.endedMonth}月结算
            </p>
            <h2 className="font-serif text-3xl">月底</h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Row k="工资" v={yuan(game.summary.salary)} />
              <Row k="生活" v={yuan(game.summary.living)} />
              <Row k="办公" v={yuan(game.summary.office)} />
              <Row k="人工" v={yuan(game.summary.payroll)} />
              <Row k="利息" v={yuan(game.summary.interest)} />
              <Row k="结余现金" v={yuan(game.cash)} />
            </dl>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {game.summary.lines.map((line, i) => (
                <li key={`${line}-${i}`}>{line}</li>
              ))}
            </ul>
            {game.pendingChoice ? (
              <div className="mt-4 rounded-xl border border-brass-2 p-3">
                <h3 className="font-serif text-xl">{game.pendingChoice.title}</h3>
                <p className="mt-1 text-sm">{game.pendingChoice.body}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {game.pendingChoice.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="min-h-11 rounded-xl border border-ink/15 bg-paper px-3 py-2 text-left"
                      onClick={() => setGame(reduce(game, { type: "choose", optionId: opt.id }))}
                    >
                      <span className="block font-medium">{opt.label}</span>
                      <span className="block text-sm text-ink-soft">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="mt-5 min-h-11 w-full rounded-xl bg-ink px-3 py-3 font-serif text-lg text-paper"
                onClick={() => setGame(reduce(game, { type: "dismiss" }))}
              >
                {game.ending ? "看这段结局" : "进入下月"}
              </button>
            )}
          </article>
        </div>
      ) : null}
    </div>
  );
}

function MusicButton() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(musicMuted());
  }, []);
  return (
    <button
      type="button"
      aria-pressed={!muted}
      aria-label={muted ? "打开背景音乐" : "关掉背景音乐"}
      onClick={() => {
        unlockAmbience();
        const next = !muted;
        setMuted(next);
        setMusicMuted(next);
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm text-foam"
    >
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      <span className="hidden sm:inline">{muted ? "音乐关" : "音乐"}</span>
    </button>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="min-w-20 shrink-0 rounded-lg border border-line bg-dock px-2 py-1.5">
      <p className="text-xs text-mist">{label}</p>
      <p className={`font-serif text-sm ${className}`}>{value}</p>
    </div>
  );
}

function TabButton({
  id,
  tab,
  setTab,
  icon,
  label,
}: {
  id: Tab;
  tab: Tab;
  setTab: (t: Tab) => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={tab === id}
      onClick={() => setTab(id)}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 text-xs ${tab === id ? "text-brass" : "text-mist"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function DealTicket({
  deal,
  active,
  muted,
  onPick,
}: {
  deal: Deal;
  active: boolean;
  muted?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={muted}
      onClick={onPick}
      className={`w-52 shrink-0 rounded-xl border px-3 py-3 text-left ${
        muted ? "border-line opacity-50" : active ? "border-brass bg-panel" : "border-line bg-dock"
      }`}
    >
      <span className="text-xs text-brass">{STAGE_LABEL[deal.stage]}</span>
      <span className="mt-1 block truncate font-medium text-foam">{deal.client}</span>
      <span className="mt-1 block text-xs text-mist">
        {MARKETS[deal.market].name} · {PRODUCTS[deal.product].name}
      </span>
      <span className="mt-2 block text-sm text-foam">${deal.valueUsd.toLocaleString("en-US")}</span>
      <span className="block text-xs text-mist">
        毛利 {Math.round(deal.margin * 100)}% · 关系 {Math.round(deal.relation)}
        {deal.stage === "production" || deal.stage === "collecting"
          ? ` · ${deal.monthsLeft > 0 ? `还要 ${deal.monthsLeft} 个月` : "这个月可以处理"}`
          : ""}
      </span>
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-brass-2/30 py-1">
      <dt className="text-ink-soft">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Profile({
  game,
  setGame,
  onClose,
}: {
  game: GameState;
  setGame: (g: GameState) => void;
  onClose: () => void;
}) {
  const world = worldAt(game.year, game.month);
  const chart = game.history.map((h) => ({ name: `${h.y}.${h.m}`, cash: h.cash }));
  const markets = Object.keys(MARKETS) as MarketId[];
  const products = (Object.keys(PRODUCTS) as ProductId[]).filter((id) => id !== "solar" || solarUnlocked(game));
  return (
    <div className="p-4 text-foam md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-brass">{firmName(game)}</p>
          <h2 className="font-serif text-3xl">档案</h2>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-line px-3 text-sm">
          关上
        </button>
      </div>
      <p className="mt-2 text-sm text-mist">
        {game.independent ? "自己吃利润，也自己付定金和海运。" : `还在上班。本月工资大约 ${yuan(salaryOf(game))}，提成是公司利润的三成。`}
        {game.staff > 0 ? ` 同事：${game.staffNames.join("、")}。` : ""}
        {game.flags.married ? " 家里有人等你。" : ""}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <DarkRow k="累计回款" v={yuanShort(game.lifetime.revenue)} />
        <DarkRow k="累计利润" v={yuanShort(game.lifetime.profit)} />
        <DarkRow k="成交笔数" v={String(game.lifetime.orders)} />
        <DarkRow k="坏账" v={String(game.lifetime.badDebt)} />
        <DarkRow k="已出运" v={String(game.lifetime.shipped)} />
        <DarkRow k="额度" v={yuanShort(creditLimit(game) - game.debt)} />
        <DarkRow k="生活费" v={yuanShort(livingOf(game))} />
        <DarkRow k="办公" v={yuanShort(officeOf(game))} />
        <DarkRow k="月工资单" v={yuanShort(payrollOf(game))} />
      </dl>

      <h3 className="mt-5 font-serif text-xl">主攻</h3>
      <p className="text-sm text-mist">开发客户时，更常撞见这个市场和品类。眼下美元 {world.usdCny.toFixed(2)}。</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {markets.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={game.aimMarket === id}
            onClick={() => setGame(reduce(game, { type: "aimMarket", id }))}
            className={`min-h-11 rounded-full border px-3 ${game.aimMarket === id ? "border-brass text-brass" : "border-line text-mist"}`}
          >
            {MARKETS[id].name}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {products.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={game.aimProduct === id}
            onClick={() => setGame(reduce(game, { type: "aimProduct", id }))}
            className={`min-h-11 rounded-full border px-3 ${game.aimProduct === id ? "border-brass text-brass" : "border-line text-mist"}`}
          >
            {PRODUCTS[id].name}
          </button>
        ))}
        {!solarUnlocked(game) ? <span className="self-center text-xs text-mist">光伏要声誉 55、专业 45，最好已经单干。</span> : null}
      </div>

      <h3 className="mt-5 font-serif text-xl">现金</h3>
      <div className="mt-2 h-36 w-full">
        {chart.length < 2 ? (
          <p className="text-sm text-mist">过完这个月，曲线才有得看。</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                formatter={(value) => yuan(Number(value))}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  background: "var(--color-paper)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-brass-2)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="cash" stroke="var(--color-brass)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 className="mt-2 font-serif text-xl">记在账上的事</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((item) => {
          const got = game.achievements.includes(item.id);
          return (
            <li key={item.id} className={`rounded-xl border px-3 py-2 ${got ? "border-brass" : "border-line opacity-60"}`}>
              <p className="text-sm text-foam">{item.title}</p>
              <p className="text-xs text-mist">{got ? item.desc : "还没发生"}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!canRetire(game)}
          onClick={() => setGame(reduce(game, { type: "retire" }))}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brass px-4 text-brass disabled:opacity-40"
        >
          <Landmark size={16} />
          {canRetire(game) ? "收手，看结局" : "三十岁或 2023 年后可以收手"}
        </button>
      </div>
    </div>
  );
}

function DarkRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-2 py-2">
      <dt className="text-xs text-mist">{k}</dt>
      <dd className="font-serif">{v}</dd>
    </div>
  );
}

function Ending({ game, onAgain, onTitle }: { game: GameState; onAgain: () => void; onTitle: () => void }) {
  const ending = game.ending;
  if (!ending) return null;
  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <img src={`${import.meta.env.BASE_URL}harbor.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="hero-shade absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col justify-end px-4 py-8">
        <p className="text-sm text-brass">{ending.rank}</p>
        <h1 className="mt-2 font-serif text-4xl text-foam md:text-5xl">{ending.title}</h1>
        <article className="paper-grain mt-5 rounded-card p-5 text-ink">
          <p>{ending.body}</p>
          <p className="mt-3 text-sm text-ink-soft">
            {game.name} · {CITIES[game.city].name} · {BACKGROUNDS[game.background].label} · {companyLabel(game)}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onAgain} className="min-h-11 rounded-xl bg-brass px-4 py-3 font-serif text-ink">
              再活一次
            </button>
            <button type="button" onClick={onTitle} className="min-h-11 rounded-xl border border-brass-2 px-4 py-3">
              回到封面
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}
