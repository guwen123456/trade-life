import type { BackgroundId, CityId, MarketId, ProductId, Stage } from "./types.ts";

export const SAVE_VERSION = 1;

export const CITIES: Record<
  CityId,
  { name: string; blurb: string; living: number; bias: ProductId[]; markets: MarketId[] }
> = {
  yiwu: {
    name: "义乌",
    blurb: "小商品的宇宙中心。询盘密，利润薄，下楼就能碰到厂。",
    living: 4200,
    bias: ["gifts", "textile"],
    markets: ["me", "sea", "latam"],
  },
  ningbo: {
    name: "宁波",
    blurb: "港口在家门口。机械和家居走得动，货代比亲戚熟。",
    living: 5200,
    bias: ["parts", "furniture"],
    markets: ["eu", "us", "jp"],
  },
  shenzhen: {
    name: "深圳",
    blurb: "电子产业链隔一条街。快，贵，客户也更挑。",
    living: 6800,
    bias: ["electronics", "parts"],
    markets: ["us", "eu", "sea"],
  },
  guangzhou: {
    name: "广州",
    blurb: "什么都做一点。四月和十月，全城都在等广交会。",
    living: 5600,
    bias: ["textile", "gifts", "furniture"],
    markets: ["me", "eu", "sea"],
  },
};

export const BACKGROUNDS: Record<
  BackgroundId,
  {
    label: string;
    blurb: string;
    cash: number;
    english: number;
    expertise: number;
    network: number;
    reputation: number;
  }
> = {
  english: {
    label: "英语专业",
    blurb: "邮件写得顺，工厂的料号还得现查。",
    cash: 26000,
    english: 68,
    expertise: 28,
    network: 32,
    reputation: 18,
  },
  engineer: {
    label: "工科出身",
    blurb: "你看得出结构，客户却嫌句子太硬。",
    cash: 40000,
    english: 42,
    expertise: 62,
    network: 24,
    reputation: 16,
  },
  family: {
    label: "家里有厂",
    blurb: "定金好说话。亲戚的期待也写进了报价。",
    cash: 86000,
    english: 36,
    expertise: 52,
    network: 48,
    reputation: 30,
  },
  sales: {
    label: "销售转行",
    blurb: "你不怕被拒绝。被拒绝是你的母语。",
    cash: 16000,
    english: 48,
    expertise: 34,
    network: 56,
    reputation: 22,
  },
};

export const PRODUCTS: Record<
  ProductId,
  {
    name: string;
    baseMargin: number;
    valueMin: number;
    valueMax: number;
    lead: number;
    freight: number;
    risk: number;
    sample: number;
  }
> = {
  gifts: {
    name: "礼品百货",
    baseMargin: 0.15,
    valueMin: 8000,
    valueMax: 22000,
    lead: 1,
    freight: 2600,
    risk: 0.12,
    sample: 900,
  },
  textile: {
    name: "服装纺织",
    baseMargin: 0.17,
    valueMin: 12000,
    valueMax: 48000,
    lead: 2,
    freight: 4200,
    risk: 0.18,
    sample: 1600,
  },
  electronics: {
    name: "消费电子",
    baseMargin: 0.19,
    valueMin: 20000,
    valueMax: 96000,
    lead: 2,
    freight: 3600,
    risk: 0.22,
    sample: 2400,
  },
  furniture: {
    name: "家具家居",
    baseMargin: 0.2,
    valueMin: 22000,
    valueMax: 78000,
    lead: 2,
    freight: 8800,
    risk: 0.15,
    sample: 2000,
  },
  parts: {
    name: "机械配件",
    baseMargin: 0.22,
    valueMin: 28000,
    valueMax: 150000,
    lead: 3,
    freight: 6200,
    risk: 0.13,
    sample: 2800,
  },
  solar: {
    name: "光伏组件",
    baseMargin: 0.11,
    valueMin: 90000,
    valueMax: 380000,
    lead: 3,
    freight: 15000,
    risk: 0.2,
    sample: 6000,
  },
};

export const MARKETS: Record<
  MarketId,
  { name: string; diff: number; pay: number; delay: number; pressure: number; size: number }
> = {
  us: { name: "美国", diff: 0.1, pay: 0.9, delay: 1, pressure: 0.03, size: 1.28 },
  eu: { name: "欧盟", diff: 0.12, pay: 0.93, delay: 1, pressure: 0.02, size: 1.16 },
  jp: { name: "日本", diff: 0.2, pay: 0.97, delay: 0, pressure: 0.04, size: 0.74 },
  sea: { name: "东南亚", diff: 0.05, pay: 0.8, delay: 1, pressure: 0.015, size: 0.92 },
  me: { name: "中东", diff: 0.07, pay: 0.7, delay: 1, pressure: 0.01, size: 1.05 },
  latam: { name: "拉美", diff: 0.08, pay: 0.62, delay: 2, pressure: 0, size: 1.18 },
};

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "询盘",
  quote: "报价",
  sample: "打样",
  confirmed: "待生产",
  production: "生产中",
  collecting: "待回款",
  won: "完成",
  lost: "丢单",
};

export const CLIENTS: Record<MarketId, string[]> = {
  us: ["Carter Home", "Miller & Co.", "BrightNest", "Oak & Field", "Lumen Goods", "Harbor & Rye"],
  eu: ["Haus Nordic", "Keller GmbH", "Atelier Marne", "Voss Living", "Bruno Import", "Svea Line"],
  jp: ["佐藤商事", "青叶株式会社", "北岛物产", "三叶贸易", "白井商店"],
  sea: ["Siam Source", "Nusantara Mart", "Lan Anh Trading", "Manila General", "Johor Goods"],
  me: ["Al Noor Trading", "Gulf Line", "Qasr Imports", "Baraka Wholesale", "Red Dune Co."],
  latam: ["Andes Casa", "Sol Mayor", "Rio Branco", "Pacífico Hogar", "Costa Libre"],
};

export const STAFF_POOL = ["周启明", "陈曼", "赵小北", "吴颖", "孙阔", "郑荔", "黄川", "林夏", "何朗", "马亭", "许安", "高宁"];

export const NAME_POOL = ["林晓舟", "陈予安", "周晚宁", "苏小满", "韩澈", "许知夏", "顾承", "叶晚", "江澄", "沈知衡"];

export const ACHIEVEMENTS: { id: string; title: string; desc: string }[] = [
  { id: "first_pi", title: "第一张 PI", desc: "客户终于在纸上签字。" },
  { id: "first_ship", title: "第一票出运", desc: "提单号比月薪更让你睡得着。" },
  { id: "first_pay", title: "第一笔货款", desc: "钱回到账户的那天，工位都亮一点。" },
  { id: "bad", title: "见识过坏账", desc: "有些已读，是永远不回。" },
  { id: "solo", title: "辞职单干", desc: "工资条停了，利润开始写你的名字。" },
  { id: "hire", title: "第一位同事", desc: "有人帮你催工厂了。" },
  { id: "million", title: "成交过百万", desc: "累计回款跨过一百万。" },
  { id: "ten", title: "成交过千万", desc: "报价单后面的零，开始要数两次。" },
  { id: "fluent", title: "邮件不用起草两遍", desc: "英语够用了。" },
  { id: "master", title: "厂里听你的", desc: "专业够硬，验货不再心虚。" },
  { id: "circle", title: "圈子认人", desc: "人脉把询盘送上门。" },
  { id: "name", title: "叫得出名字", desc: "声誉在这行里开始自己走路。" },
  { id: "storm", title: "挺过缺箱", desc: "运价风暴里你还在桌上。" },
  { id: "firm", title: "像一家公司了", desc: "四个人以上，房租不再是玩笑。" },
  { id: "group", title: "集团的味道", desc: "人一多，你开始签别人的提成。" },
];

export interface World {
  demand: number;
  freight: number;
  usdCny: number;
  headline: string;
  fair: boolean;
  usTariff: number;
}

export function worldAt(year: number, month: number): World {
  let demand = 1;
  let freight = 1;
  let usdCny = 6.85;
  let headline = "行情平淡。客户在比价，工厂在等定金。";
  let usTariff = 0;

  if (year === 2018 && month >= 7) {
    headline = "关税清单变长。美国客户把价格往海里压。";
    demand = 0.94;
    usTariff = 0.04;
    usdCny = 6.92;
  }
  if (year === 2019) {
    headline = "贸易摩擦变成长期天气。会写邮件的人开始读税则。";
    demand = 0.9;
    usTariff = 0.05;
    usdCny = 6.98;
    freight = 1.05;
  }
  if (year === 2020 && month <= 5) {
    headline = "厂门关着。询盘还在，集装箱不怎么动。";
    demand = 0.64;
    freight = 0.78;
    usdCny = 7.08;
  } else if (year === 2020) {
    headline = "复工以后订单像回潮，工位重新响起来。";
    demand = 1.16;
    freight = 1.18;
    usdCny = 6.78;
  }
  if (year === 2021) {
    headline = "一箱难求。海运费能把薄利单做成慈善。";
    demand = 1.1;
    freight = month < 8 ? 2.5 : 3.2;
    usdCny = 6.45;
  }
  if (year === 2022) {
    headline = "运价回落，人民币偏弱。窗口开着，人也挤。";
    demand = 1;
    freight = 1.42;
    usdCny = 6.78;
  }
  if (year === 2023) {
    headline = "海外在去库存。开发信掉进一口枯井。";
    demand = 0.78;
    freight = 1.08;
    usdCny = 7.12;
  }
  if (year === 2024) {
    headline = "红海绕航。船期表更像一份建议。";
    demand = 0.9;
    freight = 1.62;
    usdCny = 7.18;
  }
  if (year >= 2025) {
    headline = "订单更碎，账期更长。还在桌上的人，学会了挑客户。";
    demand = 0.88 + Math.min(0.14, (year - 2025) * 0.02);
    freight = 1.18;
    usdCny = 7.06;
  }
  if (year >= 2032) {
    headline = "这行对你已经不是天气，是气候。";
  }

  const lockedDown = year === 2020 && month <= 5;
  const fair = (month === 4 || month === 10) && !lockedDown;
  if (fair) {
    demand += 0.08;
    headline = year >= 2025 ? headline : "广交会的月份。名片比睡眠便宜。";
  }
  if (month === 3 || month === 9) demand += 0.04;

  return { demand, freight, usdCny, headline, fair, usTariff };
}
